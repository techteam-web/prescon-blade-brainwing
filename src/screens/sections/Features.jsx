import { useCallback, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { Eyebrow, CountUp } from '../../components/Primitives';
import { ArrowIcon } from '../../components/Icons';
import { FEATURE_SLIDES } from '../../data/content';
import { gsap, useGSAP, E } from '../../gsap/Gsapconfig';
import { getRender } from '../../data/renders';
import { FEATURE_BACKDROPS } from '../../data/gallery';

// A deck. One idea per slide, advanced by click, arrow keys or the rail.
//
// This screen carries the sheen at reduced strength — enough for a personality, not
// enough to compete with the slide.
//
// Every slide is composed from the same set of marked parts (`data-line` for a masked
// wipe, `data-rise` for a lifted fade), so one timeline animates every slide type and
// there is no per-slide animation code to drift out of sync.

// One backdrop per slide, chosen per slide rather than cycled — see src/data/gallery.js.
// Every one is landscape: a portrait render behind a full-width slide crops to nothing.
// The image is part of the slide, not decoration; it wipes in with the copy and drifts
// for as long as the slide is up.
const BACKDROP = FEATURE_BACKDROPS.map(getRender);

const TONE = {
  cream: 'text-blade-cream',
  copper: 'text-blade-copper',
  terracotta: 'text-blade-terracotta',
  rose: 'text-blade-rose',
};

function SlideBody({ slide }) {
  switch (slide.kind) {
    case 'statement':
      return (
        <>
          <p data-rise className="max-w-[58ch] text-body text-blade-cream/80">{slide.body}</p>
          <div data-rise className="flex flex-col gap-[0.8em] pt-[1em]">
            <Eyebrow>{slide.footnote}</Eyebrow>
            <ul className="grid grid-cols-3 gap-[1.2em] max-md:grid-cols-1">
              {slide.items.map((it, i) => (
                <li key={it.name} className="relative flex min-w-0 flex-col gap-[0.2em]">
                  {i > 0 && (
                    <span aria-hidden="true" className="absolute -left-[0.6em] top-0 h-full w-px skew-blade bg-blade-ink max-md:hidden" />
                  )}
                  <span className="truncate text-caption text-blade-cream">{it.name}</span>
                  <span className="truncate text-caption text-blade-rose/80">{it.meta}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      );

    case 'columns':
      return (
        <>
          <p data-rise className="max-w-[54ch] text-body text-blade-cream/80">{slide.body}</p>
          <div data-rise className="grid grid-cols-4 gap-[2em] pt-[0.6em] max-lg:grid-cols-2">
            {slide.columns.map((col, i) => (
              <div key={col.eyebrow} className="relative flex min-w-0 flex-col gap-[0.6em]">
                {i > 0 && (
                  <span aria-hidden="true" className="absolute -left-[1em] top-0 h-full w-px bg-blade-ink max-lg:hidden" />
                )}
                <Eyebrow>{col.eyebrow}</Eyebrow>
                <span className="text-body font-medium text-blade-cream">{col.subtitle}</span>
                <p className="text-caption text-blade-cream/70">{col.body}</p>
              </div>
            ))}
          </div>
        </>
      );

    case 'stack':
      return (
        <>
          <p data-rise className="max-w-[54ch] text-body text-blade-cream/80">{slide.body}</p>
          <div data-rise className="flex flex-col pt-[0.4em]">
            {slide.floors.map((f) => (
              <div key={f.id} className="group/s grid grid-cols-[auto_auto_auto_1fr] items-center gap-[0.9em] py-[0.5em]">
                <span aria-hidden="true" className="h-[1.8em] w-px skew-blade bg-blade-copper opacity-40 transition-opacity duration-300 group-hover/s:opacity-100" />
                <span className={`text-stat font-bold tabular-nums ${TONE[f.tone]}`}>{f.code}</span>
                <span aria-hidden="true" className="h-[1.8em] w-px skew-blade bg-blade-copper opacity-40 transition-opacity duration-300 group-hover/s:opacity-100" />
                <span className="flex min-w-0 items-baseline gap-[1.1em]">
                  <span className="text-body tabular-nums text-blade-rose">{f.height}</span>
                  <span className={`truncate text-subhead font-medium transition-transform duration-300 ease-out group-hover/s:translate-x-[6px] ${TONE[f.tone]}`}>
                    {f.name}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      );

    case 'grid':
      return (
        <div data-rise className="grid grid-cols-4 gap-[2em] max-lg:grid-cols-2">
          {slide.grid.map((col, i) => (
            <div key={col.heading} className="relative flex min-w-0 flex-col gap-[0.7em]">
              {i > 0 && (
                <span aria-hidden="true" className="absolute -left-[1em] top-0 h-full w-px bg-blade-ink max-lg:hidden" />
              )}
              <h2 className="text-caption font-bold uppercase tracking-[0.24em] text-blade-copper">{col.heading}</h2>
              <ul className="flex flex-col">
                {col.items.map((item) => (
                  <li key={item} className="border-t border-blade-ink py-[0.45em] text-caption text-blade-cream/85">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );

    case 'rows':
      return (
        <dl data-rise className="grid grid-cols-[minmax(0,15em)_1fr] content-start gap-x-[2.4em] max-md:grid-cols-1">
          {slide.rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="border-t border-blade-ink py-[0.5em] text-caption uppercase tracking-[0.16em] text-blade-rose">
                {row.label}
              </dt>
              <dd className="border-t border-blade-ink py-[0.5em] text-caption text-blade-cream max-md:border-t-0 max-md:pt-0">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      );

    case 'list': {
      const half = Math.ceil(slide.items.length / 2);
      return (
        <>
          <div data-rise className="flex items-baseline gap-[1.2em]">
            <Eyebrow>{slide.stat.label}</Eyebrow>
            <span className="text-stat font-bold text-blade-copper">{slide.stat.value}</span>
          </div>
          <div data-rise className="grid grid-cols-2 gap-x-[3em] max-md:grid-cols-1">
            {[slide.items.slice(0, half), slide.items.slice(half)].map((col, ci) => (
              <ul key={ci} className="flex min-w-0 flex-col">
                {col.map((m) => (
                  <li key={m} className="border-t border-blade-ink py-[0.5em] text-caption text-blade-cream/80">
                    {m}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </>
      );
    }

    case 'partners':
      return (
        <>
          <p data-rise className="max-w-[58ch] text-body text-blade-cream/80">{slide.body}</p>
          <ul data-rise className="flex flex-col">
            {slide.rows.map((p) => (
              <li key={p.name} className="group/p relative border-t border-blade-ink last:border-b">
                <span aria-hidden="true" className="absolute left-0 top-0 h-px w-full origin-left scale-x-0 bg-blade-copper transition-transform duration-500 ease-out group-hover/p:scale-x-100" />
                <div className="grid grid-cols-[1fr_auto] items-baseline gap-[1.4em] py-[0.5em] max-lg:grid-cols-1 max-lg:gap-[0.15em]">
                  <span className="min-w-0 text-caption font-medium text-blade-cream transition-transform duration-300 ease-out group-hover/p:translate-x-[6px]">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-caption uppercase tracking-[0.2em] text-blade-copper">
                    {p.role}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      );

    case 'stats':
      return (
        <>
          <p data-rise className="max-w-[58ch] text-body text-blade-cream/80">{slide.body}</p>
          <ul data-rise className="grid grid-cols-4 gap-[1.6em] max-lg:grid-cols-2">
            {slide.stats.map((s, i) => (
              <li key={s.id} className="flex min-w-0 flex-col gap-[0.4em] border-t border-blade-ink pt-[0.8em]">
                <span className="text-stat font-bold tabular-nums text-blade-copper">
                  <CountUp to={s.to} decimals={s.decimals ?? 0} delay={0.35 + i * 0.12} />
                </span>
                <span className="text-caption text-blade-cream/75">
                  {s.prefix}
                  {s.suffix}
                </span>
              </li>
            ))}
          </ul>
          <dl data-rise className="grid grid-cols-2 gap-[2.4em] max-md:grid-cols-1">
            {slide.works.map((w) => (
              <div key={w.label} className="flex flex-col gap-[0.3em]">
                <dt><Eyebrow>{w.label}</Eyebrow></dt>
                <dd className="text-caption text-blade-cream">{w.value}</dd>
              </div>
            ))}
          </dl>
        </>
      );

    default:
      return null;
  }
}

export function Features() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const root = useRef(null);
  const busy = useRef(false);
  const slide = FEATURE_SLIDES[index];

  const go = useCallback((next, delta) => {
    if (busy.current) return;
    busy.current = true;
    setDir(delta);
    setIndex(next);
    gsap.delayedCall(0.85, () => {
      busy.current = false;
    });
  }, []);

  const move = useCallback(
    (delta) => {
      const next = index + delta;
      if (next < 0 || next >= FEATURE_SLIDES.length) return;
      go(next, delta);
    },
    [index, go],
  );

  // One timeline, every slide: the backdrop wipes through a 12° edge and starts a slow
  // drift, the heading lines climb out of their masks, the rule draws, and the body parts
  // lift in behind it. killTweensOf first, so running the deck fast never leaves two
  // slides animating over each other.
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const lines = el.querySelectorAll('[data-line] > *');
      const rises = el.querySelectorAll('[data-rise]');
      const rule = el.querySelector('[data-slide-rule]');

      gsap.killTweensOf([...lines, ...rises, rule].filter(Boolean));

      for (const plate of el.querySelectorAll('[data-plate]')) {
        const i = Number(plate.dataset.plate);
        const on = i === index;
        const img = plate.querySelector('img');
        gsap.killTweensOf([plate, img]);

        if (on) {
          gsap.set(plate, { zIndex: 1, autoAlpha: 1 });
          gsap.set(img, {
            clipPath: dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)',
            scale: 1.14,
            xPercent: dir > 0 ? 2.5 : -2.5,
          });
          gsap.to(img, {
            clipPath: 'inset(0 0% 0 0%)',
            xPercent: 0,
            duration: 1.3,
            ease: E.out,
            overwrite: 'auto',
          });
          // The drift runs for as long as the slide is up — the image is never static.
          gsap.to(img, { scale: 1.02, duration: 14, ease: 'none', overwrite: false });
        } else {
          gsap.set(plate, { zIndex: 0 });
          gsap.to(plate, { autoAlpha: 0, duration: 0.6, ease: E.in, overwrite: 'auto' });
        }
      }

      gsap.set(lines, { yPercent: dir > 0 ? 118 : -118, rotate: dir > 0 ? 1.2 : -1.2 });
      gsap.set(rises, { y: 38, autoAlpha: 0 });
      gsap.set(rule, { scaleX: 0, transformOrigin: dir > 0 ? 'left center' : 'right center' });

      gsap
        .timeline({ defaults: { overwrite: 'auto' } })
        .to(lines, { yPercent: 0, rotate: 0, duration: 1.05, stagger: 0.075, ease: E.out }, 0.12)
        .to(rule, { scaleX: 1, duration: 0.9, ease: E.out }, 0.34)
        .to(rises, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.065, ease: E.out }, 0.42);
    },
    { dependencies: [index, dir], scope: root },
  );

  return (
    <Screen id="features" padded={false}>
      <div
        ref={root}
        className="screen-inset relative grid h-full min-h-0 grid-rows-[auto_1fr_auto] gap-[1.6em]"
        tabIndex={0}
        role="group"
        aria-label="Project features"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') move(1);
          else if (e.key === 'ArrowLeft' || e.key === 'PageUp') move(-1);
          else return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* The backdrops sit behind everything, inside the screen's own padding box so
            they bleed to the edges. */}
        <div aria-hidden="true" data-overflow-ok className="pointer-events-none absolute inset-0 -z-10">
          {BACKDROP.map((render, i) => (
            <div
              key={FEATURE_SLIDES[i].id}
              data-plate={i}
              className={`absolute inset-0 overflow-hidden ${i === index ? '' : 'invisible opacity-0'}`}
            >
              <img
                src={render.src}
                srcSet={render.srcSet}
                sizes="100vw"
                alt=""
                decoding="async"
                loading={i === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
          {/* The renders are bright. The copy has to win on every slide, so this is a
              flat darkening plus a left-weighted gradient, not a subtle vignette. */}
          <div className="absolute inset-0 z-[5] bg-blade-black/55" />
          <div
            className="absolute inset-0 z-[5]"
            style={{
              background:
                'linear-gradient(90deg, rgb(11 8 7 / 0.96) 0%, rgb(11 8 7 / 0.9) 38%, rgb(11 8 7 / 0.45) 72%, rgb(11 8 7 / 0.3) 100%)',
            }}
          />
          <div
            className="absolute inset-0 z-[5]"
            style={{
              background:
                'linear-gradient(180deg, rgb(11 8 7 / 0.75) 0%, transparent 20%, transparent 74%, rgb(11 8 7 / 0.85) 100%)',
            }}
          />
          <div className="sheen-soft absolute inset-0 z-[5]" />
        </div>

        <SectionTitle id="features" />

        <div className="flex min-h-0 flex-col justify-center gap-[1.1em] overflow-hidden">
          <div className="flex max-w-[74%] flex-col gap-[0.5em] max-lg:max-w-none">
            <span className="block overflow-hidden">
              <span data-line className="block">
                <span className="block text-caption uppercase tracking-[0.34em] text-blade-copper">
                  {slide.eyebrow}
                </span>
              </span>
            </span>
            {slide.headline.map((l) => (
              <span key={l} className="block overflow-hidden">
                <span data-line className="block">
                  <span className="block text-headline uppercase text-blade-cream max-md:text-subhead">{l}</span>
                </span>
              </span>
            ))}
            <span data-slide-rule aria-hidden="true" className="mt-[0.3em] block h-px w-[32%] bg-blade-copper" />
          </div>

          <div className="flex min-h-0 max-w-[74%] flex-col gap-[1.1em] overflow-hidden max-lg:max-w-none">
            <SlideBody slide={slide} />
          </div>
        </div>

        <div className="flex items-end justify-between gap-[2em] max-md:justify-end">
          {/* A tick per slide — the deck's position, readable at a glance. */}
          <ol className="flex items-end gap-[0.5em] max-md:hidden">
            {FEATURE_SLIDES.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => i !== index && go(i, i > index ? 1 : -1)}
                  aria-label={s.eyebrow}
                  aria-current={i === index}
                  className="group/t block py-[0.6em]"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-px origin-left bg-blade-copper transition-[width,opacity] duration-[420ms] ease-out ${
                      i === index
                        ? 'w-[3.4em] opacity-100'
                        : 'w-[1.2em] opacity-35 group-hover/t:w-[2.2em] group-hover/t:opacity-80'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ol>

          <div className="flex items-center gap-[1.4em]">
            <span className="text-caption tabular-nums tracking-[0.3em] text-blade-cream/70">
              {String(index + 1).padStart(2, '0')} / {String(FEATURE_SLIDES.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={index === 0}
              aria-label="Previous slide"
              className="group/n text-blade-cream transition-opacity duration-300 disabled:opacity-25"
            >
              <ArrowIcon size="1.5em" className="rotate-180 transition-transform duration-300 ease-out group-enabled:group-hover/n:-translate-x-[4px]" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              disabled={index === FEATURE_SLIDES.length - 1}
              aria-label="Next slide"
              className="group/n text-blade-cream transition-opacity duration-300 disabled:opacity-25"
            >
              <ArrowIcon size="1.5em" className="transition-transform duration-300 ease-out group-enabled:group-hover/n:translate-x-[4px]" />
            </button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
