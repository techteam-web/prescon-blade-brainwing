import { useRef } from 'react';
import { Screen, SplitLayout } from '../../layout/Screen';
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
// The Prescon mark appears exactly as issued (see Wordmark.jsx) — never faded into a
// watermark, never recoloured — sitting plainly atop its own stat panel instead.
//
// No pillars row any more — the client's deck carries no "three principles" copy for
// this screen, only the headline/body/stats below, so the text column is just those
// three blocks, centred with more breathing room than when a fourth block sat under
// them.

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
          {/* Unlike Features.jsx's slides, Group's copy sits on BOTH sides — the Prescon
              mark and stats on the left, the headline/body/pillars on the right — so a
              one-sided directional scrim left it readable on one edge and not the other.
              Blurred and darkened flat instead: legible everywhere, and the room reads as
              atmosphere behind the copy rather than a competing photo. scale-105 hides
              the blur's own soft edge at the screen boundary. */}
          <img
            src={BACKDROP.src}
            srcSet={BACKDROP.srcSet}
            sizes="100vw"
            alt=""
            decoding="async"
            loading="eager"
            className="h-full w-full scale-105 object-cover object-center blur-[3px] max-md:object-[50%_30%]"
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

      <div ref={root} className="h-full min-h-0">
        <SplitLayout
          ratio={46}
          text={
            <div className="flex min-h-0 flex-col justify-center gap-[1.9em] max-md:gap-[1.1em]">
              <SectionTitle id="group" />

              <div className="flex flex-col gap-[0.5em]">
                <span data-line className="block">
                  <span className="block text-caption uppercase tracking-[0.34em] text-blade-copper">
                    {c.eyebrow}
                  </span>
                </span>
                {c.headline.map((l) => (
                  <span key={l} data-line className="block">
                    <span className="block text-headline uppercase text-blade-cream max-md:text-subhead">
                      {l}
                    </span>
                  </span>
                ))}
                <span data-group-rule aria-hidden="true" className="mt-[0.3em] block h-px w-[32%] bg-blade-copper" />
              </div>

              {/* Below md, SplitLayout drops `visual` behind the text as a faint
                  20%-opacity backdrop — right for a photo, wrong here: `visual` carries
                  the Prescon mark and the stats, actual content, not scenery. Left
                  as-is it read as ghosting collided with the paragraph underneath.
                  Hidden there instead (visualClassName below) and replaced with this
                  compact block, in-flow and fully legible, sized to fit the same
                  no-scroll screen instead of the roomier two-cluster desktop layout. */}
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

              <p data-rise className="max-w-[54ch] text-body text-blade-cream/80 max-md:text-caption">
                {c.body}
              </p>
            </div>
          }
          visual={
            <div data-rise className="flex h-full min-h-0 flex-col justify-center gap-[1.7em]">
              <PresconLogo className="w-[clamp(6rem,9vw,9.5rem)]" />
              <span aria-hidden="true" className="h-px w-full bg-blade-ink" />

              {/* By the numbers — three figures, side by side, dividers rather than a
                  grid gap so the row reads as one measured statement. */}
              <ul className="grid grid-cols-3 gap-x-[1.6em]">
                {numericStats.map((s, i) => (
                  <li
                    key={s.id}
                    className={`flex min-w-0 flex-col gap-[0.4em] ${
                      i > 0 ? 'border-l border-blade-ink pl-[1.6em]' : ''
                    }`}
                  >
                    <span className="flex items-baseline gap-[0.15em] text-stat font-bold tabular-nums text-blade-copper">
                      <CountUp to={s.to} decimals={s.decimals} />
                      <span className="text-[0.5em] text-blade-copper/75">{s.suffix}</span>
                    </span>
                    <span className="text-caption text-blade-cream/70">{s.label}</span>
                  </li>
                ))}
              </ul>

              <span aria-hidden="true" className="h-px w-full bg-blade-ink" />

              {/* The rest — legacy and portfolio breadth — as plain statements, a tick
                  mark standing in for the number none of them have. */}
              <ul className="flex flex-col">
                {factStats.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start gap-[0.7em] border-t border-blade-ink py-[0.6em] first:border-t-0 first:pt-0"
                  >
                    <span aria-hidden="true" className="mt-[0.5em] h-[3px] w-[3px] shrink-0 bg-blade-copper" />
                    <span className="text-caption text-blade-cream/75">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          }
          visualClassName="max-md:hidden"
        />
      </div>
    </Screen>
  );
}
