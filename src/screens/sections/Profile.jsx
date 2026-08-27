import { useRef } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { CONTENT } from '../../data/content';
import { gsap, useGSAP } from '../../gsap/Gsapconfig';

// public/assets/tower/tower-elevation.png — a bare massing elevation, no callouts baked
// in. Its native box is 920×3840; the aspect ratio below keeps the overlay's percentage
// positions meaningful at any render size.
const TOWER_SRC = '/assets/tower/tower-elevation.png';
const TOWER_RATIO = 920 / 3840;

// Percentages down the image where each label's leader line meets it — hand-measured
// against the image's own colour bands (the gold crown cap, and the single copper
// amenity-floor band carrying both 13F and 12F), not derived from real floor-height
// data, so they live here rather than in content.js alongside the client's copy.
//
// 13F and 12F previously pointed at 60% and 72% — well above and below the actual
// copper band, which measures ~63.6%–68.2% of the image (confirmed by sampling the
// PNG's pixels, not eyeballing it). Moved both inside it — spaced enough apart that
// their circle nodes (see `marks.map` below) clear each other rather than touching,
// since a 3-point gap wasn't enough room for two full circles.
const FLOOR_Y = { '41F': 6, '13F': 63, '12F': 70, GL: 87.5 };
const RANGE_Y = { '15F–40F': 36, '1F–11F': 76, '-1F/-3F': 95 };
const SPINE_TOP = FLOOR_Y['41F'];
const SPINE_BOTTOM = FLOOR_Y.GL;

export function Profile() {
  const c = CONTENT.profile;
  const root = useRef(null);

  const marks = [
    ...c.floors.map((f) => ({ ...f, y: FLOOR_Y[f.level], kind: 'floor' })),
    ...c.ranges.map((r) => ({ ...r, y: RANGE_Y[r.code], kind: 'range' })),
  ].sort((a, b) => a.y - b.y);

  // Same rise-and-fade arrival every default-layout screen uses (see Group.jsx) for the
  // text column. The tower's own callouts get a second idea layered on top: the spine
  // draws downward first — a rule reveal, same technique as `data-profile-rule` — and
  // the floor circles pop in behind it, each roughly where the line has just reached, so
  // it reads as the connector being drawn rather than everything simply fading in at once.
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const lines = el.querySelectorAll('[data-line] > *');
      const rises = el.querySelectorAll('[data-rise]');
      const rule = el.querySelector('[data-profile-rule]');
      const spine = el.querySelector('[data-spine]');
      const marksEl = el.querySelectorAll('[data-mark]');
      const nodes = el.querySelectorAll('[data-mark-node]');

      gsap.set(lines, { y: 44, autoAlpha: 0 });
      gsap.set(rises, { y: 32, autoAlpha: 0 });
      gsap.set(rule, { scaleX: 0, transformOrigin: 'left center' });
      gsap.set(spine, { scaleY: 0, transformOrigin: 'top center' });
      gsap.set(marksEl, { x: -14, autoAlpha: 0 });
      gsap.set(nodes, { scale: 0, autoAlpha: 0, transformOrigin: 'center center' });

      gsap
        .timeline({ defaults: { overwrite: 'auto' } })
        .to(lines, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.1, ease: 'power2.out' }, 0.1)
        .to(rule, { scaleX: 1, duration: 0.9, ease: 'power2.out' }, 0.5)
        .to(rises, { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.09, ease: 'power2.out' }, 0.55)
        .to(spine, { scaleY: 1, duration: 1.1, ease: 'power2.inOut' }, 0.85)
        .to(marksEl, { x: 0, autoAlpha: 1, duration: 0.7, stagger: 0.09, ease: 'power2.out' }, 1.0)
        .to(nodes, { scale: 1, autoAlpha: 1, duration: 0.55, stagger: 0.09, ease: 'back.out(2.4)' }, 1.05);
    },
    { scope: root },
  );

  return (
    <Screen id="profile">
      {/* A soft copper glow behind the tower, the same radial language Menu.jsx uses —
          without it the screen is flat ambient wash and nothing else, which read as
          bare next to every other section's backdrop. */}
      <div
        aria-hidden="true"
        data-overflow-ok
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 55% 65% at 78% 45%, rgb(154 96 70 / 0.32) 0%, rgb(127 80 58 / 0.2) 32%, rgb(var(--scrim-rgb) / 0) 68%)',
        }}
      />

      {/* Not SplitLayout: its mobile fallback drops `visual` behind the text as a
          faint, stretched 20%-opacity ghost — wrong for this tower, which is real
          content (the thing the floor list opposite describes) and very tall and
          narrow (aspect ratio ~0.24), so stretching it to a full-bleed box distorted
          it badly. Kept side by side at every width instead, the same idea as desktop:
          the tower's own tall-narrow shape actually suits a phone's tall-narrow
          viewport better than most images do. Tower left, text right — the column
          ratio narrows the tower's share on mobile (38%) since the floor list needs
          the width more there than the desktop layout's wider stat lines do; both
          widen back out at md. */}
      <div
        ref={root}
        className="grid h-full min-h-0 w-full grid-cols-[48fr_52fr] gap-[3%] md:grid-cols-[52fr_48fr] md:gap-[4%]"
      >
        <div data-rise className="relative min-h-0 min-w-0 overflow-hidden">
          <div className="flex h-full items-center justify-start gap-[0.7em] pl-[clamp(1rem,4vw,4.5rem)] lg:gap-[1.1em]">
            {/* h-full w-full plus object-contain on the <img>, not a hand-tuned
                aspect-ratio box — the browser fits both the column's width and the
                row's height at once, so no breakpoint (this now includes mobile) needs
                its own guessed percentage to avoid clipping or overflow. */}
            <div className="relative h-full w-full">
              <img
                src={TOWER_SRC}
                alt="The Blade — massing elevation, floor zones marked"
                decoding="async"
                className="h-full w-full object-contain"
              />
            </div>

            {/* The leader column: a single spine connecting the four named floors, a
                circle at each one carrying its code — the reference slide's composition
                — plus the plain floor-range labels ticked off the same line, without
                tracing the building's own uneven isometric edge for every connector.
                Same composition at every width now, just narrower on a phone — the
                node circles and labels shrink further there (max-md below) and the
                labels lean on `truncate` the same way the floor list opposite already
                does, rather than disappearing outright. */}
            <div className="relative h-[92%] w-[4.6em] shrink-0 md:h-[62%] md:w-[9em] lg:h-[92%] lg:w-[13em]">
              {/* Centred under the node column below, so the line runs through every
                  circle's middle rather than its own left edge. */}
              <span
                data-spine
                aria-hidden="true"
                className="absolute left-[0.75em] w-px bg-blade-cream/25 md:left-[1.2em]"
                style={{ top: `${SPINE_TOP}%`, height: `${SPINE_BOTTOM - SPINE_TOP}%` }}
              />

              {marks.map((m) => {
                const isFloor = m.kind === 'floor';
                return (
                  <div
                    key={isFloor ? m.level : m.code}
                    data-mark
                    className="absolute left-0 flex items-center gap-[0.4em] md:gap-[0.7em]"
                    style={{ top: `${m.y}%`, transform: 'translateY(-50%)' }}
                  >
                    {/* A fixed-width slot, floor or range mark alike, so both share the
                        same centre line as the spine above instead of each drifting to
                        its own natural flex width. */}
                    <span className="flex h-[1.5em] w-[1.5em] shrink-0 items-center justify-center md:h-[2.1em] md:w-[2.1em]">
                      {isFloor ? (
                        <span
                          data-mark-node
                          className={`relative z-10 flex h-full w-full items-center justify-center rounded-full border bg-blade-black text-[0.5rem] font-bold tabular-nums md:text-[0.6rem] ${
                            m.level === '41F'
                              ? 'border-blade-cream text-blade-cream'
                              : 'border-blade-copper text-blade-copper'
                          }`}
                        >
                          {m.level}
                        </span>
                      ) : (
                        <span aria-hidden="true" className="h-px w-[0.9em] bg-blade-cream/25" />
                      )}
                    </span>
                    {isFloor ? (
                      <span className="min-w-0 truncate text-[0.625rem] text-blade-cream/85 md:text-caption">{m.label}</span>
                    ) : (
                      <span className="flex min-w-0 items-baseline gap-[0.4em] whitespace-nowrap">
                        <span className="text-[0.55rem] tabular-nums text-blade-cream/45 md:text-[0.625rem]">{m.code}</span>
                        <span className="truncate text-[0.55rem] text-blade-cream/45 md:text-[0.625rem]">{m.label}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-col justify-center overflow-hidden">
          <div className="flex min-h-0 flex-col justify-center gap-[min(2.2em,2.6vh)]">
            <SectionTitle id="profile" />

            <div className="flex flex-col gap-[0.6em]">
              {c.headline.map((l) => (
                <span key={l} data-line className="block">
                  <span className="block text-headline uppercase text-blade-cream max-md:text-subhead">
                    {l}
                  </span>
                </span>
              ))}
              <span data-profile-rule aria-hidden="true" className="mt-[0.3em] block h-px w-[32%] bg-blade-copper" />
            </div>

            <p data-rise className="max-w-[54ch] text-body text-blade-cream/80 max-md:text-caption">
              {c.body}
            </p>

            <ul data-rise className="flex flex-col pt-[min(0.6em,1vh)]">
              {c.floors.map((f) => (
                <li
                  key={f.level}
                  className="flex min-w-0 items-baseline gap-[0.9em] border-t border-blade-ink py-[min(1.1em,1.7vh)] first:border-t-0 max-md:gap-[0.5em]"
                >
                  <span className="flex shrink-0 items-baseline">
                    <span aria-hidden="true" className="skew-blade mr-[0.35em] inline-block h-[0.85em] w-px bg-blade-copper/50" />
                    <span
                      className={`text-stat font-bold tabular-nums ${
                        f.level === '41F' ? 'text-blade-cream' : 'text-blade-copper'
                      }`}
                    >
                      {f.level}
                    </span>
                    <span aria-hidden="true" className="skew-blade ml-[0.35em] inline-block h-[0.85em] w-px bg-blade-copper/50" />
                  </span>
                  <span className="shrink-0 text-caption tabular-nums text-blade-cream/55 max-md:hidden">{f.height}</span>
                  <span aria-hidden="true" className="shrink-0 text-blade-cream/35 max-md:hidden">
                    –
                  </span>
                  <span className="min-w-0 truncate text-body font-medium text-blade-cream max-md:text-caption">
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Screen>
  );
}
