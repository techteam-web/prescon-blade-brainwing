// THE CUT — the one page transition in this application, and the machinery that plays it.
//
// Every factory here mutates a timeline the director hands it and must leave behind a
// label called 'swap' — the frame at which the state machine exchanges screens.
//
// The director, not the factories, owns: the paused timeline, the onComplete, the
// attachment of onSwap at the label, and the reduced-motion branch. A factory therefore
// cannot forget the swap, and reduced motion is one wrapper rather than six conditionals.
//
// THE INVARIANT that makes the imperative swap safe: nothing of the outgoing screen is
// visible at the 'swap' label — it is covered, folded away or faded out — and no tween
// targets the outgoing screen at or after that label. assertNoPostSwapTweens enforces
// the second half in development.

import { gsap, SplitText, D, E, prefersReducedMotion, durationScale } from './Gsapconfig';

/* ------------------------------------------------------------------ helpers */

const q = (root, sel) => (root ? Array.from(root.querySelectorAll(sel)) : []);

// Several markers are legitimately optional per screen — the Landing has no separate
// byline element, Floor Plans has no [data-headline], and so on. GSAP logs "target not
// found" for a null or empty target, which would train everyone to ignore its warnings.
// Falling back to a detached element keeps the timeline's shape and stays silent: it
// accepts every CSS property GSAP might set and is never in the document, so nothing it
// receives can be seen. A plain object would warn on `y` and `autoAlpha` instead.
const INERT = typeof document === 'undefined' ? {} : document.createElement('div');
const some = (...targets) => {
  const list = targets.flat().filter(Boolean);
  return list.length ? list : INERT;
};

// gsap.to([]) logs "target not found". Screens opt into markers, so an empty list is a
// normal outcome, not a mistake — skip the tween instead of warning.
const has = (t) => (Array.isArray(t) ? t.length > 0 : !!t);
const to = (tl, targets, vars, pos) => (has(targets) ? tl.to(targets, vars, pos) : tl);
const set = (tl, targets, vars, pos) => (has(targets) ? tl.set(targets, vars, pos) : tl);

const headlineOf = (el) => el?.querySelector('[data-headline]') ?? null;
const ruleOf = (el) => el?.querySelector('[data-headline-rule]') ?? null;
const contentOf = (el) => q(el, '[data-stagger]');

// A masked line reveal: the mask edge is skewed to the blade angle, so text wipes up
// through a blade edge rather than a flat one.
const LINE_MASK_HIDDEN = 'inset(0 0 100% 0)';
const LINE_MASK_SHOWN = 'inset(0 0 -10% 0)';

// The seam's own mask, and it runs the other way: zero height sitting on the BOTTOM edge,
// opening upwards. Drawn forwards it climbs from the floor of the frame to the ceiling;
// played backwards it retracts down the way it came.
const SEAM_HIDDEN = 'inset(100% 0 0 0)';
const SEAM_SHOWN = 'inset(-10% 0 0 0)';

// SplitText instances must be reverted or the DOM keeps its wrapper spans. The director
// collects them and reverts on completion.
function splitLines(el, cleanups) {
  if (!el) return [];
  const split = new SplitText(el, { type: 'lines', linesClass: 'blade-line' });
  cleanups.push(() => split.revert());
  return split.lines;
}

// One source of truth for the angle, and it is the stylesheet — see the derivation on
// --blade-angle in src/styles/theme.css. Read live so a future change to the token moves
// the CSS diagonals and the JS-driven ones together.
function bladeAngle() {
  if (typeof window === 'undefined') return 18.49;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--blade-angle');
  const deg = parseFloat(raw);
  return Number.isFinite(deg) && deg > 0 ? deg : 18.49;
}

/* ------------------------------------------------------------------ the cut */

// The seam crosses the viewport centre at the blade angle: at the top edge it is
// (height / 2) × tan(angle) to the RIGHT of centre, at the bottom edge the same distance
// to the left — the direction the wordmark's own slash leans.
//
// clip-path percentages resolve against each half's box (which is the viewport), so the
// offset has to be expressed as a percentage of width, and therefore recomputed per
// transition rather than authored in CSS. The polygons run from -30% to 130% vertically
// so the halves can rotate a degree without a corner ever entering frame; the seam
// offset is scaled by 1.6 to match, since the seam keeps travelling past the edges.
function seamClip() {
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  const half = (((h / 2) * Math.tan((bladeAngle() * Math.PI) / 180)) / w) * 100;
  const k = half * 1.6;

  return {
    left: `polygon(-60% -30%, ${50 + k}% -30%, ${50 - k}% 130%, -60% 130%)`,
    right: `polygon(${50 + k}% -30%, 160% -30%, 160% 130%, ${50 - k}% 130%)`,
  };
}

// Content the destination screen re-composes for itself once the cut is open. Hidden in
// the clone so the halves carry only the page's ground — its render, its scrims, its
// furniture — and the copy arrives live rather than sliding in pre-drawn.
const CLONE_QUIET =
  '[data-menu-row],[data-menu-brand],[data-menu-rule],[data-landing-line],' +
  '[data-landing-eyebrow],[data-wordmark],[data-enter],[data-headline],' +
  '[data-headline-rule],[data-stagger]';

// A screen, frozen. The original is mid-transition and carrying inline transform and
// opacity from GSAP; .blade-split-half > * in base.css resets all of that, so the clone
// only has to be structurally faithful.
function cloneScreen(el, quiet) {
  if (!el) return null;
  const clone = el.cloneNode(true);

  clone.removeAttribute('id');
  clone.setAttribute('aria-hidden', 'true');
  // Duplicate ids and flip ids would be visible to querySelector while both the live
  // screen and its copy are in the document.
  for (const n of clone.querySelectorAll('[id]')) n.removeAttribute('id');
  for (const n of clone.querySelectorAll('[data-flip-id]')) n.removeAttribute('data-flip-id');
  for (const n of clone.querySelectorAll('button, a, input, [tabindex]')) {
    n.setAttribute('tabindex', '-1');
  }
  if (quiet) for (const n of clone.querySelectorAll(CLONE_QUIET)) n.style.visibility = 'hidden';

  // cloneNode copies a canvas element but never its pixels. Best effort: a 2D canvas
  // copies cleanly; a WebGL surface without a preserved drawing buffer arrives blank,
  // which for the half-second it is on screen is a dark rectangle in a dark transition.
  const srcCanvas = el.querySelectorAll('canvas');
  const dstCanvas = clone.querySelectorAll('canvas');
  for (let i = 0; i < dstCanvas.length; i += 1) {
    const s = srcCanvas[i];
    const d = dstCanvas[i];
    if (!s || !d || !s.width || !s.height) continue;
    try {
      d.width = s.width;
      d.height = s.height;
      d.getContext('2d')?.drawImage(s, 0, 0);
    } catch {
      /* tainted or context-less — it simply arrives blank */
    }
  }
  return clone;
}

const emptyHalf = (el) => {
  while (el?.firstChild) el.removeChild(el.firstChild);
};

// The whole transition, both directions.
//
//   'open'  — leaving a page. The seam draws itself bottom-to-top across the page you
//             are on, the page comes apart along it, and the two halves are drawn off
//             the sides to reveal the destination settling out of a blur.
//
//   'close' — coming back. Exactly that, reversed: the destination arrives as two
//             halves from off-stage, they close on the seam, the seam lights along the
//             join and then retracts top-to-bottom, and the page composes itself.
//
// The halves are viewport-sized boxes holding a clone of whichever screen is being cut,
// clipped to one side of the seam. Nothing but `transform` and `filter` animates on
// them, so the cut is composited whatever the screen underneath happens to be doing.
function theCut(ctx, mode) {
  const { outEl, inEl, chrome, tl, cleanups } = ctx;
  const root = chrome.split;
  const L = chrome.splitL;
  const R = chrome.splitR;
  const seam = chrome.splitSeam;
  // The bloom is animated separately from the seam it belongs to, and deliberately: GSAP
  // composes skewX before scaleX, so scaling the seam element would shear its own angle
  // by the scale factor and the cut would drift off the mark mid-transition. The seam
  // carries the skew and nothing else; only the bloom breathes.
  const glow = chrome.splitGlow ?? null;

  const opening = mode === 'open';
  const source = opening ? outEl : inEl;

  // No furniture, or nothing to slice (the very first navigation off the gate): there is
  // no cut to make, so fall back rather than play half of one.
  if (!root || !L || !R || !seam || !source) return crossfade(ctx);

  const angle = bladeAngle();
  const geo = seamClip();

  // Self-healing: a killed timeline (StrictMode's mount → cleanup → mount) never runs
  // its cleanups, so clear whatever the last build left behind before filling the halves.
  emptyHalf(L);
  emptyHalf(R);
  const left = cloneScreen(source, !opening);
  const right = cloneScreen(source, !opening);
  if (left) L.appendChild(left);
  if (right) R.appendChild(right);
  cleanups.push(() => {
    emptyHalf(L);
    emptyHalf(R);
  });

  // The parted state. Each half leaves along its own side, drifting a little against the
  // other and turning under a degree — enough that the two pieces read as separated
  // objects rather than as one image behind two masks.
  const APART = {
    l: { x: '-68vw', y: '2.2vh', rotate: -0.9, scale: 1.045, filter: 'blur(5px)' },
    r: { x: '68vw', y: '-2.2vh', rotate: 0.9, scale: 1.045, filter: 'blur(5px)' },
  };
  const JOINED = { x: 0, y: 0, rotate: 0, scale: 1, filter: 'blur(0px)' };

  tl.set(root, { autoAlpha: 1 })
    .set(L, { clipPath: geo.left, transformOrigin: '50% 50%' })
    .set(R, { clipPath: geo.right, transformOrigin: '50% 50%' })
    .set(seam, { skewX: -angle });

  if (opening) {
    /* ------------------------------------------------------------ leaving */
    tl.set([L, R], { autoAlpha: 1 })
      .set(L, JOINED)
      .set(R, JOINED)
      .set(seam, { autoAlpha: 1, clipPath: SEAM_HIDDEN })
      .set(some(glow), { scaleX: 0.25, autoAlpha: 0.7, transformOrigin: '50% 50%' })
      // The clones stand in for the outgoing screen from the first frame, so nothing
      // after this needs to touch it — which is what makes the swap safe this early.
      .set(some(outEl), { autoAlpha: 0 })
      .set(inEl, { autoAlpha: 1, zIndex: 2, scale: 1.07, filter: 'blur(18px)', transformOrigin: '50% 50%' });

    stageIncoming(tl, inEl, cleanups, 0);

    tl
      // The seam draws itself from the bottom of the frame to the top.
      .to(seam, { clipPath: SEAM_SHOWN, duration: 0.62, ease: E.out }, 0)
      .to(some(glow), { scaleX: 1, autoAlpha: 1, duration: 0.5, ease: E.out }, 0)
      .addLabel('swap', 0.3)
      // The anticipation: half a percent of compression against the seam while it
      // finishes drawing. Nobody reads it as a movement — they read the part that
      // follows as a release.
      .to([L, R], { scale: 0.993, duration: 0.38, ease: 'power2.in' }, 0.14)
      // …and the page comes apart along it.
      .to(L, { ...APART.l, duration: 1.15, ease: E.out }, 0.52)
      .to(R, { ...APART.r, duration: 1.15, ease: E.out }, 0.57)
      .to(some(glow), { scaleX: 3.4, duration: 0.65, ease: E.out }, 0.62)
      .to(seam, { autoAlpha: 0, duration: 0.65, ease: E.out }, 0.62)
      .to(inEl, { scale: 1, filter: 'blur(0px)', duration: 1.5, ease: E.out }, 0.5)
      .to([L, R], { autoAlpha: 0, duration: 0.35, ease: 'none' }, 1.35)
      .set(root, { autoAlpha: 0 }, 1.75);

    revealIncoming(tl, inEl, 0.95);
    return tl;
  }

  /* -------------------------------------------------------------- returning */
  tl.set([L, R], { autoAlpha: 1 })
    .set(L, APART.l)
    .set(R, APART.r)
    .set(seam, { autoAlpha: 0, clipPath: SEAM_SHOWN })
    .set(some(glow), { scaleX: 3.4, autoAlpha: 1, transformOrigin: '50% 50%' })
    // The destination is live and underneath from the first frame, with everything the
    // clone is hiding still staged. The widening gap between the closing halves therefore
    // shows the page you are arriving at rather than an empty stage — and the hand-off at
    // the end is between two identical grounds, so it cannot be seen.
    .set(inEl, { autoAlpha: 1, zIndex: 1 })
    .set(some(outEl), { zIndex: 2, transformOrigin: '50% 50%' });

  stageIncoming(tl, inEl, cleanups, 0);

  tl
    // The page you are leaving recedes rather than being covered — the halves close over
    // an empty stage, which is what makes the join read as an arrival.
    .to(some(outEl), { scale: 1.06, filter: 'blur(16px)', autoAlpha: 0, duration: 0.72, ease: E.in }, 0)
    .to(L, { ...JOINED, duration: 1.18, ease: E.out }, 0.12)
    .to(R, { ...JOINED, duration: 1.18, ease: E.out }, 0.17)
    .addLabel('swap', 0.78)
    // The join lights.
    .to(seam, { autoAlpha: 1, duration: 0.34, ease: E.out }, 1.0)
    .to(some(glow), { scaleX: 1, duration: 0.34, ease: E.out }, 1.0)
    // The hand-off. Everything the clone was hiding animates in from here.
    .set([L, R], { autoAlpha: 0 }, 1.3)
    // …and the seam retracts, the draw played backwards.
    .to(seam, { clipPath: SEAM_HIDDEN, duration: 0.55, ease: E.in }, 1.32)
    .to(some(glow), { scaleX: 0.25, duration: 0.55, ease: E.in }, 1.32)
    .to(seam, { autoAlpha: 0, duration: 0.25 }, 1.75)
    .set(root, { autoAlpha: 0 }, 2.0);

  revealIncoming(tl, inEl, 1.3);
  return tl;
}

export const bladeOpen = (ctx) => theCut(ctx, 'open');
export const bladeClose = (ctx) => theCut(ctx, 'close');

/* ------------------------------------------------- the destination composing */

// The two halves of the destination's own animation, split so the staging can be pinned
// to frame 0 (before anything is visible) and the reveal to whenever the cut opens.
//
// One vocabulary, every screen: whatever markers a screen happens to carry are the ones
// that move. A screen that carries none simply arrives — the cut is the animation there.

function partsOf(el) {
  // A landing headline marks its own lines, so it must not also be run through
  // SplitText — the two would fight over the same nodes.
  const landing = q(el, '[data-landing-line]');
  return {
    title: el?.querySelector('[data-flip-id^="ttl:"]') ?? null,
    headline: landing.length ? null : headlineOf(el),
    rule: ruleOf(el),
    stagger: contentOf(el),
    rows: q(el, '[data-menu-row]'),
    spine: el?.querySelector('[data-menu-rule]') ?? null,
    brand: el?.querySelector('[data-menu-brand]') ?? null,
    landing,
    eyebrow: el?.querySelector('[data-landing-eyebrow]') ?? null,
    // Same corner-mark exclusion as introSequence below — Landing carries both the
    // fixed, never-animated corner BrandLockup and its own hero mark.
    lockup: el?.querySelector('[data-wordmark]:not([data-menu-brand]):not([data-corner-mark])') ?? null,
    enter: el?.querySelector('[data-enter]') ?? null,
  };
}

const STAGED = new WeakMap();

function stageIncoming(tl, inEl, cleanups, at) {
  if (!inEl) return;
  const p = partsOf(inEl);
  p.lines = splitLines(p.headline, cleanups);
  STAGED.set(inEl, p);

  set(tl, some(p.title), { clipPath: LINE_MASK_HIDDEN, y: 16 }, at);
  set(tl, p.lines, { clipPath: LINE_MASK_HIDDEN }, at);
  set(tl, some(p.rule), { scaleX: 0, transformOrigin: 'left center' }, at);
  set(tl, p.stagger, { y: 34, autoAlpha: 0 }, at);
  set(tl, p.rows, { autoAlpha: 0, x: -34, skewX: -bladeAngle() * 0.45 }, at);
  set(tl, some(p.spine), { scaleY: 0, transformOrigin: 'top center' }, at);
  set(tl, some(p.brand), { autoAlpha: 0, y: 16 }, at);
  set(tl, p.landing, { autoAlpha: 0, y: 30 }, at);
  set(tl, some(p.eyebrow), { autoAlpha: 0, y: 12 }, at);
  set(tl, some(p.lockup), { autoAlpha: 0, y: 18 }, at);
  set(tl, some(p.enter), { autoAlpha: 0, y: 14 }, at);
}

function revealIncoming(tl, inEl, at) {
  const p = inEl ? STAGED.get(inEl) : null;
  if (!p) return;

  to(tl, some(p.title), { clipPath: LINE_MASK_SHOWN, y: 0, duration: 0.75 }, at);
  to(tl, p.lines, { clipPath: LINE_MASK_SHOWN, duration: 0.9, stagger: 0.08 }, at + 0.1);
  to(tl, some(p.rule), { scaleX: 1, duration: 0.8 }, at + 0.4);
  to(tl, p.stagger, { y: 0, autoAlpha: 1, duration: 0.85, stagger: D.stagger }, at + 0.16);

  // The menu's spine stands up first and the rows unfold off it, each one shedding its
  // skew as it lands — the blade angle arriving at rest.
  to(tl, some(p.spine), { scaleY: 1, duration: 0.95 }, at - 0.1);
  to(tl, p.rows, { autoAlpha: 1, x: 0, skewX: 0, duration: 0.8, stagger: 0.055 }, at + 0.08);
  to(tl, some(p.brand), { autoAlpha: 1, y: 0, duration: 0.7 }, at + 0.05);

  to(tl, some(p.eyebrow), { autoAlpha: 1, y: 0, duration: 0.8 }, at);
  to(tl, p.landing, { autoAlpha: 1, y: 0, duration: 0.95, stagger: 0.075 }, at + 0.1);
  to(tl, some(p.lockup), { autoAlpha: 1, y: 0, duration: 0.8 }, at + 0.35);
  to(tl, some(p.enter), { autoAlpha: 1, y: 0, duration: 0.7 }, at + 0.5);
}

/* ---------------------------------------------------------------- factories */

// Used for every in-screen layer swap: floor-to-floor in Floor Plans, panel-to-panel in
// Amenities, tab-to-tab in Specifications. No cut — these are not page changes.
export function plateSlide({ outEl, inEl, tl, opts = {} }) {
  const dir = opts.direction === 'back' ? -1 : 1;

  tl.set(inEl, { autoAlpha: 0, zIndex: 2, x: 80 * dir, clipPath: 'inset(0 100% 0 0)' })
    .set(some(outEl), { zIndex: 1 });

  tl.to(
    some(outEl),
    { x: -80 * dir, autoAlpha: 0, clipPath: 'inset(0 0 0 100%)', duration: 0.5, ease: E.in },
    0,
  )
    .addLabel('swap', 0.28)
    .set(inEl, { autoAlpha: 1 }, 'swap')
    .to(inEl, { x: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.6 }, 'swap');

  return tl;
}

// Fullscreen granted → landing, ~4.2s, runs once.
export function introSequence({ inEl, chrome, tl, cleanups }) {
  const strike = chrome.introLine;
  // Landing carries TWO [data-wordmark] instances: the fixed corner BrandLockup
  // (marked data-corner-mark, never animates — see the comment on it in
  // Landing.jsx) and the hero mark beside the headline, which is the one that
  // actually travels from centre stage to its resting position. Excluding the
  // corner mark from both queries used to leave it stuck mid-transition: ripped
  // out to centre screen and animated back, while the real hero mark just sat
  // there untouched.
  const marks = q(inEl, '[data-wordmark-path]').filter((p) => !p.closest('[data-corner-mark]'));
  const eyebrow = inEl?.querySelector('[data-landing-eyebrow]') ?? null;
  const byline = inEl?.querySelector('[data-landing-byline]') ?? null;
  const hero = inEl?.querySelector('[data-hero]') ?? null;
  const scrim = inEl?.querySelector('[data-scrim]') ?? null;
  const lockup = inEl?.querySelector('[data-wordmark]:not([data-corner-mark])') ?? null;
  const lines = splitLines(headlineOf(inEl), cleanups);
  const enter = inEl?.querySelector('[data-enter]') ?? null;
  const enterRule = inEl?.querySelector('[data-enter] [data-control-rule]') ?? null;

  // Stroke-draw needs a measured path length per glyph contour.
  for (const p of marks) {
    const len = typeof p.getTotalLength === 'function' ? p.getTotalLength() : 0;
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
  }

  // The mark starts centred in the viewport and travels to its landing position. Its
  // rest position is wherever the layout puts it, so the offset is measured rather than
  // authored — and measured after fonts are ready, which the gate guarantees.
  const travel = { x: 0, y: 0, scale: 1 };
  if (lockup) {
    const r = lockup.getBoundingClientRect();
    travel.x = window.innerWidth / 2 - (r.left + r.width / 2);
    travel.y = window.innerHeight / 2 - (r.top + r.height / 2);
    travel.scale = Math.min(1.45, (window.innerWidth * 0.34) / Math.max(r.width, 1));
  }

  tl.set(inEl, { autoAlpha: 1, zIndex: 2 })
    .set(strike, { autoAlpha: 1, scaleY: 0, skewX: 0, transformOrigin: 'center center' })
    .set(lockup, { autoAlpha: 1, x: travel.x, y: travel.y, scale: travel.scale })
    .set(has(marks) ? marks : {}, { fillOpacity: 0, strokeOpacity: 1 })
    .set(some(eyebrow, byline, enter), { autoAlpha: 0 })
    .set(some(eyebrow), { letterSpacing: '1.2em' })
    .set(some(byline), { y: 12 })
    .set(some(hero, scrim), { autoAlpha: 0 })
    .set(some(hero), { scale: 1.18 })
    .set(some(enterRule), { scaleX: 0, transformOrigin: 'left center' });

  tl.to(strike, { scaleY: 1, duration: 0.9 }, 0.2)
    // The line becomes the blade — at the mark's own angle, measured off the wordmark's
    // diagonal stroke rather than eyeballed. See --blade-angle in theme.css.
    .to(strike, { skewX: -bladeAngle(), duration: 0.5 }, 0.75)
    // The strike, and in its wake the mark draws itself.
    .to(strike, { scaleY: 1.6, autoAlpha: 0, duration: 0.55, ease: E.in }, 1.05)
    .to(has(marks) ? marks : {}, { strokeDashoffset: 0, duration: 1.1 }, 1.05)
    .to(has(marks) ? marks : {}, { fillOpacity: 1, strokeOpacity: 0, duration: 0.5 }, 1.85)
    .to(some(eyebrow), { autoAlpha: 1, letterSpacing: '0.5em', duration: 0.9 }, 1.3)
    .to(some(byline), { autoAlpha: 1, y: 0, duration: 0.7 }, 1.45)
    .to(some(hero, scrim), { autoAlpha: 1, duration: 2.4 }, 2.1)
    .to(some(hero), { scale: 1, duration: 2.4 }, 2.1)
    // The mark travels from centre to its landing position.
    .to(some(lockup), { x: 0, y: 0, scale: 1, duration: 1.1 }, 2.4)
    .addLabel('swap', 2.4)
    .to(some(enterRule), { scaleX: 1, duration: 0.7 }, 3.6)
    .to(some(enter), { autoAlpha: 1, duration: 0.7 }, 3.6);
  to(tl, lines, { clipPath: LINE_MASK_SHOWN, duration: 1.0, stagger: 0.09 }, 3.1);

  if (has(lines)) gsap.set(lines, { clipPath: LINE_MASK_HIDDEN });
  return tl;
}

/* ------------------------------------------------------------------ director */

// One transition, played forwards to go deeper and backwards to come back. The pairs
// table is therefore only deciding which direction the cut runs in.
const PAIRS = {
  'gate>intro': introSequence,
  'gate>landing': introSequence,
  'intro>landing': introSequence,

  'landing>menu': bladeOpen,
  'menu>section': bladeOpen,
  'landing>section': bladeOpen,
  'section>section': bladeOpen,

  'section>menu': bladeClose,
  'menu>landing': bladeClose,
  'section>landing': bladeClose,
};

// Kept for the state machine's call site. The aperture transition it used to feed — the
// Flip morph of a menu row into a section title — was replaced by the cut, and nothing
// measures the outgoing world synchronously any more.
export function captureFlip() {
  return null;
}

// Reduced motion: identical swap semantics, one mechanism, 0.25s.
function crossfade({ outEl, inEl, tl }) {
  tl.set(inEl, { autoAlpha: 0, zIndex: 2 })
    .set(some(outEl), { zIndex: 1 })
    .to(some(outEl), { autoAlpha: 0, duration: 0.25, ease: 'none' }, 0)
    .addLabel('swap', 0.125)
    .set(inEl, { autoAlpha: 1 }, 'swap')
    .to(inEl, { autoAlpha: 1, duration: 0.25, ease: 'none' }, 0);
  return tl;
}

// Hiding the outgoing screen in-frame at 'swap' is only safe if nothing animates it
// afterwards. This proves it on every transition, in development.
function assertNoPostSwapTweens(tl, outEl) {
  if (!outEl) return;
  const at = tl.labels.swap ?? 0;
  for (const child of tl.getChildren(true, true, false)) {
    if (child.startTime() < at - 1e-6) continue;
    const targets = typeof child.targets === 'function' ? child.targets() : [];
    if (targets.includes(outEl)) {
      console.error(
        '[director] a tween targets the outgoing screen at or after the swap label. ' +
          'The outgoing screen is hidden at that frame, so this tween cannot be seen.',
        child,
      );
    }
  }
}

export function buildTransition(ctx) {
  const key = `${ctx.from.stage}>${ctx.to.stage}`;
  const factory = ctx.opts?.transition ?? PAIRS[key] ?? bladeOpen;
  const cleanups = [];
  const scale = durationScale();

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: E.out, duration: D.reveal },
    onComplete: () => {
      for (const fn of cleanups) fn();
      ctx.onComplete?.();
    },
  });

  (prefersReducedMotion() ? crossfade : factory)({ ...ctx, tl, cleanups });

  if (!('swap' in tl.labels)) {
    console.error(`[director] ${key}: factory produced no 'swap' label.`);
    tl.addLabel('swap', tl.duration() * 0.5);
  }

  tl.call(ctx.onSwap, null, 'swap');
  if (scale !== 1) tl.timeScale(1 / scale);
  if (import.meta.env.DEV) assertNoPostSwapTweens(tl, ctx.outEl);

  return tl;
}
