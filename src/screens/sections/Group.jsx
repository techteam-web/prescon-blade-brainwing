import { useRef } from 'react';
import { Screen, SplitLayout } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { Eyebrow, CountUp } from '../../components/Primitives';
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

const BACKDROP = getRender('group-01');

export function Group() {
  const c = CONTENT.group;
  const root = useRef(null);

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

      <div ref={root} className="h-full min-h-0">
        <SplitLayout
          ratio={46}
          text={
            <div className="flex min-h-0 flex-col justify-center gap-[1.5em]">
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

              <p data-rise className="max-w-[52ch] text-body text-blade-cream/80 max-md:text-caption">
                {c.body}
              </p>

              <div data-rise className="grid grid-cols-3 gap-[2em] pt-[0.4em] max-md:grid-cols-1 max-md:gap-[1.2em]">
                {c.pillars.map((p, i) => (
                  <div key={p.eyebrow} className="relative flex min-w-0 flex-col gap-[0.5em]">
                    {i > 0 && (
                      <span aria-hidden="true" className="absolute -left-[1em] top-0 h-full w-px bg-blade-ink max-md:hidden" />
                    )}
                    <Eyebrow>{p.eyebrow}</Eyebrow>
                    <p className="text-caption text-blade-cream/70">{p.body}</p>
                  </div>
                ))}
              </div>
            </div>
          }
          visual={
            <div data-rise className="flex h-full min-h-0 flex-col justify-center gap-[1.6em]">
              <PresconLogo className="w-[clamp(6rem,9vw,9.5rem)]" />
              <span aria-hidden="true" className="h-px w-full bg-blade-ink" />
              <ul className="grid grid-cols-2 gap-x-[1.6em] gap-y-[1.4em]">
                {c.stats.map((s) => (
                  <li key={s.id} className="flex min-w-0 flex-col gap-[0.35em] border-t border-blade-ink pt-[0.8em]">
                    <span className="flex items-baseline gap-[0.15em] text-stat font-bold tabular-nums text-blade-copper">
                      <CountUp to={s.to} />
                      <span className="text-[0.5em] text-blade-copper/75">{s.suffix}</span>
                    </span>
                    <span className="text-caption text-blade-cream/70">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          }
        />
      </div>
    </Screen>
  );
}
