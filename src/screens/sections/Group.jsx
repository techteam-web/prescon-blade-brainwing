import { useRef } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { CountUp } from '../../components/Primitives';
import { PresconLogo } from '../../components/Wordmark';
import { CONTENT } from '../../data/content';
import { getRender } from '../../data/renders';
import { gsap, useGSAP } from '../../gsap/Gsapconfig';

// The one screen in the deck that is about the developer rather than the building —
// carries a backdrop now (blade-10) so it doesn't sit flat next to every render-backed
// section around it, same object-cover + scrim technique as Features.jsx's slides.
//
// Two columns: stat figures and facts on the left, title/headline/body on the right.
// No Prescon mark or ghost wordmark on this screen — tried both, the client reference
// doesn't carry either, just the two copy columns.

const BACKDROP = getRender('group-01');

export function Group() {
  const c = CONTENT.group;
  const root = useRef(null);

  // Split once: a stat with a `to` is a figure worth counting up, everything else is a
  // fact worth stating plainly. Rendered as two distinct clusters below — a numbers row
  // and a highlights list — rather than interleaved in one grid, so a long sentence
  // ("Waterfront development — Prescon Midtown Bay…") never has to share a narrow
  // column with a big tabular-nums figure.
  const numericStats = c.stats.filter((s) => s.to != null);
  const factStats = c.stats.filter((s) => s.to == null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const lines = el.querySelectorAll('[data-line] > *');
      const rises = el.querySelectorAll('[data-rise]');
      const rule = el.querySelector('[data-group-rule]');

      gsap.set(lines, { y: 44, autoAlpha: 0 });
      gsap.set(rises, { y: 32, autoAlpha: 0 });
      gsap.set(rule, { scaleX: 0, transformOrigin: 'left center' });

      gsap
        .timeline({ defaults: { overwrite: 'auto' } })
        .to(lines, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.1, ease: 'power2.out' }, 0.1)
        .to(rule, { scaleX: 1, duration: 0.9, ease: 'power2.out' }, 0.5)
        .to(rises, { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.09, ease: 'power2.out' }, 0.55);
    },
    { scope: root },
  );

  return (
    <Screen id="group">
      {/* The backdrop sits behind everything, inside the screen's own padding box so it
          bleeds to the edges — same structure as Features.jsx's backdrop layer. */}
      {BACKDROP && (
        <div aria-hidden="true" data-overflow-ok className="pointer-events-none absolute inset-0 -z-10">
          <img
            src={BACKDROP.src}
            srcSet={BACKDROP.srcSet}
            sizes="100vw"
            alt=""
            decoding="async"
            loading="eager"
            className="h-full w-full scale-105 object-cover object-center blur-[5px] max-md:object-[50%_30%]"
          />
          <div className="absolute inset-0 z-[5] bg-blade-black/60" />
          <div
            className="absolute inset-0 z-[5]"
            style={{
              background:
                'linear-gradient(180deg, rgb(var(--scrim-rgb) / 0.6) 0%, transparent 17%, transparent 80%, rgb(var(--scrim-rgb) / 0.62) 100%)',
            }}
          />
          <div className="sheen-soft absolute inset-0 z-[5]" />
        </div>
      )}

      {/* w-fit + mx-auto rather than a full-width grid — each column sizes to its own
          content instead of stretching across a fixed track, so the pair centres as
          one measured block instead of leaving empty track space down one side. */}
      <div
        ref={root}
        className="mx-auto flex h-full min-h-0 w-fit max-w-full items-center gap-x-[4%] max-md:w-full max-md:flex-col max-md:justify-center max-md:gap-x-0"
      >
        {/* Column 1 — the stat figures, stacked with the same thin-hairline-divider
            language the deck already uses for stat and list slides (Features.jsx's
            'stats'/'list' kinds), then the facts as a small-square-bulleted list.
            Sized up from the shared text-stat/text-caption tokens — bigger throughout
            this screen only, not a change to the shared type scale. */}
        <div data-rise className="hidden h-full min-h-0 flex-col justify-center md:flex">
          <ul className="flex flex-col">
            {numericStats.map((s, i) => (
              <li
                key={s.id}
                className={`flex flex-col gap-[0.35em] py-[0.85em] ${
                  i > 0 ? 'border-t border-blade-ink' : ''
                }`}
              >
                <span className="flex items-baseline gap-[0.15em] text-[clamp(1.9rem,2.5vw,3.4rem)] font-bold tabular-nums text-blade-copper [text-shadow:0_2px_14px_rgb(0_0_0_/_0.45)]">
                  <CountUp to={s.to} decimals={s.decimals} />
                  <span className="text-[0.5em] text-blade-copper/75">{s.suffix}</span>
                </span>
                <span className="text-[clamp(0.8rem,0.85vw,1.15rem)] text-blade-cream/70">{s.label}</span>
              </li>
            ))}
          </ul>

          <ul className="mt-[0.6em] flex flex-col gap-[0.3em]">
            {factStats.map((s) => (
              <li key={s.id} className="flex items-start gap-[0.6em]">
                <span aria-hidden="true" className="mt-[0.5em] h-[6px] w-[6px] shrink-0 bg-blade-copper" />
                <span className="text-[clamp(0.8rem,0.85vw,1.15rem)] leading-snug text-blade-cream/70">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2 — title, headline and body, same as every other screen's copy
            column. Below md this is the only column shown; the stats and facts
            collapse into the compact block just under the headline instead. */}
        <div className="flex min-h-0 flex-col justify-center gap-[1.7em] max-md:gap-[1.1em]">
          <div className="flex flex-col gap-[0.5em]">
            <SectionTitle id="group" />
            <span data-group-rule aria-hidden="true" className="block h-px w-[3.4rem] bg-blade-copper" />
          </div>

          <div className="flex flex-col gap-[0.5em]">
            <span data-line className="block">
              <span className="block text-[clamp(0.8rem,0.85vw,1.15rem)] uppercase tracking-[0.34em] text-blade-copper">
                {c.eyebrow}
              </span>
            </span>
            {c.headline.map((l) => {
              // Presentational split only — `l` itself is untouched, still the
              // verbatim "BEYOND THE ORDINARY." string; this just breaks it across
              // two coloured lines the way the client's slide does. Sized up from the
              // shared text-headline token — bigger on this screen only.
              const [first, ...rest] = l.split(' ');
              const restStr = rest.join(' ');
              return (
                <span key={l} data-line className="block">
                  <span className="block text-[clamp(2.4rem,3.7vw,5.75rem)] uppercase text-blade-cream max-md:text-subhead [text-shadow:0_2px_18px_rgb(0_0_0_/_0.5)]">
                    {first}
                  </span>
                  {restStr && (
                    <span className="block text-[clamp(2.4rem,3.7vw,5.75rem)] uppercase text-blade-copper max-md:text-subhead [text-shadow:0_2px_18px_rgb(0_0_0_/_0.5)]">
                      {restStr}
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          {/* Below md, column 1 is hidden (see its md:flex above) — this compact block
              replaces it, in-flow and fully legible, sized to fit the same no-scroll
              screen instead of the roomier two-column desktop layout. */}
          <div data-rise className="hidden flex-col gap-[0.7em] max-md:flex">
            <div className="flex items-center gap-[1em]">
              <PresconLogo className="w-[4.6rem] shrink-0" />
              <span aria-hidden="true" className="h-[1.8em] w-px shrink-0 bg-blade-ink" />
              <ul className="grid min-w-0 flex-1 grid-cols-3 gap-x-[0.8em]">
                {numericStats.map((s) => (
                  <li key={s.id} className="flex min-w-0 flex-col gap-[0.15em]">
                    <span className="flex items-baseline gap-[0.1em] text-caption font-bold tabular-nums text-blade-copper">
                      <CountUp to={s.to} decimals={s.decimals} />
                      <span className="text-[0.75em] text-blade-copper/75">{s.suffix}</span>
                    </span>
                    <span className="text-[0.6rem] leading-tight text-blade-cream/60">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="flex flex-col gap-[0.25em]">
              {factStats.map((s) => (
                <li key={s.id} className="flex items-start gap-[0.5em]">
                  <span aria-hidden="true" className="mt-[0.45em] h-[3px] w-[3px] shrink-0 bg-blade-copper" />
                  <span className="text-[0.625rem] leading-snug text-blade-cream/60">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <p
            className="max-w-[58ch] text-[clamp(1rem,1.2vw,1.8rem)] text-blade-cream/85 [text-shadow:0_1px_10px_rgb(0_0_0_/_0.4)] max-md:text-caption"
            data-rise
          >
            {c.body}
          </p>
        </div>
      </div>
    </Screen>
  );
}
