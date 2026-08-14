// Named transition factories. Each mutates a timeline the director hands it and must
// leave behind a label called 'swap' — the frame at which the state machine exchanges
// screens.
//
// The director, not the factories, owns: the paused timeline, the onComplete, the
// attachment of onSwap at the label, z-index, and the reduced-motion branch. A factory
// therefore cannot forget the swap, and reduced motion is one wrapper rather than six
// conditionals.
//
// THE INVARIANT that makes the imperative swap safe: nothing of the outgoing screen is
// visible at the 'swap' label — it is covered, folded away or faded out — and no tween
// targets the outgoing screen at or after that label. assertNoPostSwapTweens enforces
// the second half in development.

import { gsap, Flip, SplitText, D, E, prefersReducedMotion, durationScale } from './Gsapconfig';

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
// normal outcome, not a mistake — skip the tween instead of warning. Screens without a
// [data-headline] (Floor Plans, Specifications, Views, The Address) hit this on every
// transition.
const has = (t) => (Array.isArray(t) ? t.length > 0 : !!t);
const to = (tl, targets, vars, pos) => (has(targets) ? tl.to(targets, vars, pos) : tl);
const set = (tl, targets, vars, pos) => (has(targets) ? tl.set(targets, vars, pos) : tl);

// Content the IN half staggers in. Screens opt in by marking elements.
const contentOf = (el) => q(el, '[data-stagger]');
const headlineOf = (el) => el?.querySelector('[data-headline]') ?? null;
const ruleOf = (el) => el?.querySelector('[data-headline-rule]') ?? null;

// A masked line reveal: the mask edge is skewed to the blade angle, so text wipes up
// through a 12° edge rather than a flat one.
const LINE_MASK_HIDDEN = 'inset(0 0 100% 0)';
const LINE_MASK_SHOWN = 'inset(0 0 -10% 0)';

// SplitText instances must be reverted or the DOM keeps its wrapper spans. The director
// collects them and reverts on completion.
function splitLines(el, cleanups) {
  if (!el) return [];
  const split = new SplitText(el, { type: 'lines', linesClass: 'blade-line' });
  cleanups.push(() => split.revert());
  return split.lines;
}

/* ---------------------------------------------------------------- factories */

// T1 — default section → section, ~2.0s.
export function bladeSweep({ outEl, inEl, chrome, tl, cleanups }) {
  const shards = q(chrome.curtain, '[data-shard]');
  const content = contentOf(inEl);
  const lines = splitLines(headlineOf(inEl), cleanups);
  const rule = ruleOf(inEl);

  tl.set(chrome.curtain, { autoAlpha: 1 })
    .set(shards, { scaleY: 0, transformOrigin: 'bottom center', '--edge': 0 })
    .set(inEl, { autoAlpha: 0, zIndex: 2 })
    .set(some(outEl), { zIndex: 1 })
    ;
  set(tl, content, { y: 40, autoAlpha: 0 });
  set(tl, lines, { clipPath: LINE_MASK_HIDDEN });
  set(tl, some(rule), { scaleX: 0, transformOrigin: 'left center' });

  tl.to(some(outEl), { y: -32, autoAlpha: 0, scale: 1.04, filter: 'blur(6px)', duration: 0.5, ease: E.in }, 0)
    .to(shards, { scaleY: 1, duration: 0.62, stagger: { each: 0.045, from: 'start' } }, 0.1)
    .to(shards, { '--edge': 1, duration: 0.31, stagger: { each: 0.045, from: 'start' } }, 0.1)
    .to(shards, { '--edge': 0, duration: 0.31, stagger: { each: 0.045, from: 'start' } }, 0.41)
    .addLabel('swap', 0.72)
    // The rail is above the curtain and never covered, so its crossfade reads through.
    .to(some(chrome.railSwap), { autoAlpha: 0, duration: 0.18, ease: E.soft }, 0.62)
    .set(inEl, { autoAlpha: 1 }, 'swap')
    .to(some(chrome.railSwap), { autoAlpha: 1, duration: 0.3, ease: E.soft }, 0.8)
    .set(shards, { transformOrigin: 'top center' }, 0.86)
    .to(shards, { scaleY: 0, duration: 0.66, stagger: { each: 0.045, from: 'end' } }, 0.86)
    .set(chrome.curtain, { autoAlpha: 0 }, 1.55);
  to(tl, content, { y: 0, autoAlpha: 1, duration: 0.85, stagger: D.stagger }, 1.05);
  to(tl, lines, { clipPath: LINE_MASK_SHOWN, duration: 0.9, stagger: 0.08 }, 1.1);
  to(tl, some(rule), { scaleX: 1, duration: 0.7 }, 1.35);

  return tl;
}

// T2 — landing → menu, ~1.9s. A full-width panel rises from below, its top edge skewed
// to 12° so it arrives as a blade edge.
export function crownRise({ outEl, inEl, chrome, tl, cleanups }) {
  const outLines = q(outEl, '[data-headline] .blade-line, [data-landing-line]');
  const hero = outEl?.querySelector('[data-hero]') ?? null;
  const panel = chrome.risePanel;
  const index = q(inEl, '[data-menu-index]');
  const labels = q(inEl, '[data-menu-label]');
  const rule = inEl?.querySelector('[data-menu-rule]') ?? null;
  const visual = inEl?.querySelector('[data-menu-visual]') ?? null;
  const brand = inEl?.querySelector('[data-menu-brand]') ?? null;
  void cleanups;

  tl.set(inEl, { autoAlpha: 0, zIndex: 2 })
    .set(some(outEl), { zIndex: 1 })
    .set(panel, { autoAlpha: 1, yPercent: 115, '--edge': 1 })
    .set(index, { autoAlpha: 0, x: -20 })
    .set(labels, { clipPath: LINE_MASK_HIDDEN })
    .set(some(visual), { autoAlpha: 0, scale: 1.06, transformOrigin: 'center center' })
    .set(some(brand), { autoAlpha: 0, y: 18 })
    .set(some(rule), { scaleY: 0, transformOrigin: 'top center' });

  to(tl, outLines, { y: -60, autoAlpha: 0, duration: 0.7, ease: E.in, stagger: { each: 0.06, from: 'end' } }, 0);
  tl.to(some(hero), { scale: 1.12, autoAlpha: 0, duration: 1.2 }, 0.12)
    .to(panel, { yPercent: 0, duration: 0.95 }, 0.2)
    .to(panel, { '--edge': 0, duration: 0.45 }, 0.7)
    .addLabel('swap', 0.85)
    .set(inEl, { autoAlpha: 1 }, 'swap')
    .to(panel, { autoAlpha: 0, duration: 0.4 }, 1.1);
  to(tl, index, { autoAlpha: 0.35, x: 0, duration: 0.6, stagger: 0.04 }, 1.0);
  to(tl, labels, { clipPath: LINE_MASK_SHOWN, duration: 0.8, stagger: D.stagger }, 1.06);
  to(tl, some(rule), { scaleY: 1, duration: 1.0 }, 1.2);
  tl.to(some(visual), { autoAlpha: 1, scale: 1, duration: 1.15 }, 1.0)
    .to(some(brand), { autoAlpha: 1, y: 0, duration: 0.7 }, 1.12);

  return tl;
}

// T3 — menu → section, ~2.0s. The clicked row physically becomes the section's title.
// This is the app's signature moment.
//
// Flip is used as a MEASUREMENT device only: Flip.fit(..., {getVars:true}) returns the
// transform delta without applying it, so the motion itself stays .set() + .to() and the
// timeline remains seekable — which the fullscreen freeze depends on.
export function aperture({ outEl, inEl, chrome, capture, tl, cleanups }) {
  const pairs = resolveFlip(capture, inEl, chrome?.railSwap);
  const others = capture?.siblings ?? [];
  const content = contentOf(inEl);
  const lines = splitLines(headlineOf(inEl), cleanups);

  tl.set(inEl, { autoAlpha: 0, zIndex: 2 })
    .set(some(outEl), { zIndex: 1 });
  set(tl, content, { y: 40, autoAlpha: 0 });
  set(tl, lines, { clipPath: LINE_MASK_HIDDEN });

  // The chosen row's parts are pre-placed at their menu geometry, then animate to rest.
  for (const { el, vars } of pairs) tl.set(el, { ...vars, autoAlpha: 1 }, 0);

  // Non-selected rows shear away from the chosen one, alternating by row parity.
  others.forEach(({ el, offset, dir }) => {
    tl.to(
      el,
      { skewX: -12, x: 120 * dir, autoAlpha: 0, duration: 0.55, ease: E.in },
      Math.abs(offset) * 0.03,
    );
  });

  tl.to(some(outEl), { autoAlpha: 0, duration: 0.45, ease: E.in }, 0.4)
    .addLabel('swap', 0.62)
    .set(inEl, { autoAlpha: 1 }, 'swap');

  for (const { el } of pairs) {
    tl.to(el, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.95 }, 'swap');
  }

  to(tl, content, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.06 }, 'swap+=0.57');
  to(tl, lines, { clipPath: LINE_MASK_SHOWN, duration: 0.9, stagger: 0.08 }, 'swap+=0.6');

  return tl;
}

// T4 — section → menu, ~2.0s.
//
// The section collapses into a single copper line, that line stands up as the menu's
// vertical spine, and the rows unfold from it. Every part of the menu re-animates: the
// render, the wordmark, the rule and the rows all arrive, every time.
//
// The old version scaled a HORIZONTAL line to 90× its height, which produced a fat
// copper slab that sat over an already-visible menu and then vanished. It animated
// nothing and meant nothing. A line that becomes the thing you are navigating with does.
export function returnFold({ outEl, inEl, chrome, tl }) {
  const line = chrome.foldLine;
  const rows = q(inEl, '[data-menu-row]');
  const rule = inEl?.querySelector('[data-menu-rule]') ?? null;
  const visual = inEl?.querySelector('[data-menu-visual]') ?? null;
  const brand = inEl?.querySelector('[data-menu-brand]') ?? null;

  tl.set(inEl, { autoAlpha: 1, zIndex: 1 })
    .set(some(outEl), { zIndex: 2, transformOrigin: 'center center' })
    .set(some(rule), { scaleY: 0, transformOrigin: 'top center' })
    .set(some(visual), { autoAlpha: 0, scale: 1.06, transformOrigin: 'center center' })
    .set(some(brand), { autoAlpha: 0, y: 18 })
    .set(line, { autoAlpha: 1, scaleX: 0, scaleY: 1, transformOrigin: 'center center' });
  set(tl, rows, { autoAlpha: 0, x: -28 });

  tl.to(some(outEl), { scaleY: 0.02, autoAlpha: 0, filter: 'blur(8px)', duration: 0.7, ease: E.in }, 0)
    .to(line, { scaleX: 1, duration: 0.4 }, 0.55)
    .addLabel('swap', 0.75)
    // The hold: 0.12s on nothing but the line. Then it collapses to a point as the
    // menu's spine stands up in its place.
    .to(line, { scaleX: 0, duration: 0.45, ease: E.in }, 0.9)
    .to(line, { autoAlpha: 0, duration: 0.2 }, 1.3)
    .to(some(rule), { scaleY: 1, duration: 0.95 }, 0.9)
    .to(some(visual), { autoAlpha: 1, scale: 1, duration: 1.1 }, 1.0)
    .to(some(brand), { autoAlpha: 1, y: 0, duration: 0.7 }, 1.1);
  to(tl, rows, { autoAlpha: 1, x: 0, duration: 0.85, stagger: { each: 0.055, from: 'start' } }, 1.15);

  return tl;
}

// T4b — menu or section → landing, ~1.6s. The reverse of crownRise: the panel falls back
// down off the top and the landing rebuilds itself behind it. The landing is a screen you
// return to, so it re-animates rather than simply reappearing.
export function descend({ outEl, inEl, chrome, tl, cleanups }) {
  const panel = chrome.risePanel;
  const hero = inEl?.querySelector('[data-hero]') ?? null;
  const scrim = inEl?.querySelector('[data-scrim]') ?? null;
  const lines = q(inEl, '[data-landing-line]');
  const eyebrow = inEl?.querySelector('[data-landing-eyebrow]') ?? null;
  const lockup = inEl?.querySelector('[data-wordmark]') ?? null;
  const enter = inEl?.querySelector('[data-enter]') ?? null;
  void cleanups;

  tl.set(inEl, { autoAlpha: 0, zIndex: 1 })
    .set(some(outEl), { zIndex: 2 })
    .set(panel, { autoAlpha: 1, yPercent: 0, '--edge': 0 })
    .set(some(hero), { autoAlpha: 0, scale: 1.1 })
    .set(some(scrim), { autoAlpha: 0 })
    .set(some(eyebrow, lockup, enter), { autoAlpha: 0, y: 16 });
  set(tl, lines, { yPercent: 110 });

  tl.to(some(outEl), { autoAlpha: 0, y: 26, duration: 0.5, ease: E.in }, 0)
    .to(panel, { '--edge': 1, duration: 0.3 }, 0.1)
    .addLabel('swap', 0.42)
    .set(inEl, { autoAlpha: 1 }, 'swap')
    .to(panel, { yPercent: -115, duration: 1.0 }, 0.5)
    .to(panel, { autoAlpha: 0, duration: 0.3 }, 1.3)
    .to(some(hero, scrim), { autoAlpha: 1, duration: 1.3 }, 0.6)
    .to(some(hero), { scale: 1, duration: 1.6 }, 0.6)
    .to(some(eyebrow), { autoAlpha: 1, y: 0, duration: 0.7 }, 0.85);
  to(tl, lines, { yPercent: 0, duration: 0.95, stagger: 0.075 }, 0.95);
  tl.to(some(lockup), { autoAlpha: 1, y: 0, duration: 0.8 }, 1.15)
    .to(some(enter), { autoAlpha: 1, y: 0, duration: 0.7 }, 1.3);

  return tl;
}

// T5 — used for landing → menu fallbacks and every in-screen layer swap: floor-to-floor
// in Floor Plans, panel-to-panel in Amenities, tab-to-tab in Specifications. No curtain.
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

// T6 — fullscreen granted → landing, ~4.2s, runs once.
export function introSequence({ inEl, chrome, tl, cleanups }) {
  const strike = chrome.introLine;
  const marks = q(inEl, '[data-wordmark-path]');
  const eyebrow = inEl?.querySelector('[data-landing-eyebrow]') ?? null;
  const byline = inEl?.querySelector('[data-landing-byline]') ?? null;
  const hero = inEl?.querySelector('[data-hero]') ?? null;
  const scrim = inEl?.querySelector('[data-scrim]') ?? null;
  const lockup = inEl?.querySelector('[data-wordmark]') ?? null;
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
    // The line becomes the blade.
    .to(strike, { skewX: -12, duration: 0.5 }, 0.75)
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

/* ---------------------------------------------------------------------- Flip */

// Called SYNCHRONOUSLY inside navigate(), before any setState: it must measure the old
// world while it is still on screen.
export function captureFlip(from, to, chrome, opts) {
  if (!(from.stage === 'menu' && to.stage === 'section')) return null;
  const root = chrome.menuRoot;
  if (!root) return null;

  const nodes = Array.from(root.querySelectorAll(`[data-flip-id$=":${to.section}"]`));
  if (!nodes.length) return null;

  // Rows that were not chosen shear away from the chosen index, outward.
  const rows = Array.from(root.querySelectorAll('[data-menu-row]'));
  const chosenIndex = opts?.index ?? rows.findIndex((r) => r.dataset.section === to.section);
  const siblings = rows
    .map((el, i) => ({ el, offset: i - chosenIndex, dir: i % 2 === 0 ? 1 : -1 }))
    .filter((r) => r.offset !== 0);

  return {
    flipState: Flip.getState(nodes, { props: 'color,letterSpacing,fontWeight,opacity' }),
    siblings,
  };
}

// Called at timeline-build time, AFTER commit, while BOTH screens are mounted and laid
// out. Both geometries are final at that instant because both hosts are absolute
// inset-0 — the incoming's layout does not depend on the outgoing's removal.
export function resolveFlip(capture, inEl, ...extraRoots) {
  if (!capture?.flipState) return [];
  // The label lands in the incoming screen; the index lands in the top rail, which is
  // persistent chrome and therefore outside the screen being swapped in.
  const roots = [inEl, ...extraRoots].filter(Boolean);
  return capture.flipState.targets
    .map((src) => {
      const id = src.dataset.flipId || src.dataset.flipReleased;
      let dest = null;
      for (const root of roots) {
        dest = root.querySelector(`[data-flip-id="${id}"]`);
        if (dest) break;
      }
      if (!dest) return null;
      let vars;
      try {
        vars = Flip.fit(dest, capture.flipState.getElementState(src), {
          getVars: true,
          scale: true,
          absolute: false,
        });
      } catch {
        // Fall back to fitting against the still-live source node. Valid because the
        // capture happened before the swap, so the node is measurable here.
        vars = Flip.fit(dest, src, { getVars: true, scale: true, absolute: false });
      }
      if (!vars) return null;
      delete vars.duration;
      delete vars.ease;
      return { el: dest, vars };
    })
    .filter(Boolean);
}

/* ------------------------------------------------------------------ director */

const PAIRS = {
  'gate>intro': introSequence,
  'gate>landing': introSequence,
  'intro>landing': introSequence,
  'landing>menu': crownRise,
  'menu>section': aperture,
  'section>menu': returnFold,
  'menu>landing': descend,
  'section>landing': descend,
  'section>section': bladeSweep,
  'landing>section': bladeSweep,
};

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
  const factory = ctx.opts?.transition ?? PAIRS[key] ?? bladeSweep;
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
