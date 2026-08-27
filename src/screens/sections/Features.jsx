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
// Every slide is composed from the same set of marked parts (`data-line` for the
// headline/eyebrow, `data-rise` for the body) and both rise up the y axis from
// opacity 0 to 1, so one timeline animates every slide type and there is no
// per-slide animation code to drift out of sync.

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
       
                 {/* PHONE TEXT FIX: max-md:text-caption added — text-body floors at 14px and
              stayed that size on phone; dropping to text-caption's 11px floor below the
              md breakpoint (768px) is the "smaller on phone" change, applied the same
              way everywhere text-body appears in this file. */}
          <p data-rise className="max-w-[58ch] text-body text-blade-cream/80 max-md:text-caption">{slide.body}</p>
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
          {/* PHONE TEXT FIX: max-md:text-caption on the intro paragraph and the column
              subtitle, same reasoning as the 'statement' case above. */}
          <p data-rise className="max-w-[54ch] text-body text-blade-cream/80 max-md:text-caption">{slide.body}</p>
          <div data-rise className="grid grid-cols-4 gap-[2em] pt-[0.6em] max-lg:grid-cols-2">
            {slide.columns.map((col, i) => (
              <div key={col.eyebrow} className="relative flex min-w-0 flex-col gap-[0.6em]">
                {i > 0 && (
                  <span aria-hidden="true" className="absolute -left-[1em] top-0 h-full w-px bg-blade-ink max-lg:hidden" />
                )}
                <Eyebrow>{col.eyebrow}</Eyebrow>
                <span className="text-body font-medium text-blade-cream max-md:text-caption">{col.subtitle}</span>
                <p className="text-[calc(var(--text-caption)*1.03)] text-blade-cream/70 3xl:text-[calc(var(--text-caption)*1.05)] 6xl:text-[calc(var(--text-caption)*1.07)] max-md:text-[0.625rem]">{col.body}</p>
              </div>
            ))}
          </div>
        </>
      );

    case 'stack':
      return (
        <>
          {/* PHONE TEXT FIX: same text-body -> max-md:text-caption drop, plus the floor
              height and floor name shrink a step on phone (text-body->text-caption,
              text-subhead->text-body) so a full floor list is legible without feeling
              oversized next to the copper stack. */}
          <p data-rise className="max-w-[54ch] text-body text-blade-cream/80 max-md:text-caption">{slide.body}</p>
          <div data-rise className="flex flex-col pt-[0.4em]">
            {slide.floors.map((f) => (
              <div key={f.id} className="group/s grid grid-cols-[auto_auto_auto_1fr] items-center gap-[0.9em] py-[0.5em]">
                <span aria-hidden="true" className="h-[1.8em] w-px skew-blade bg-blade-copper opacity-40 transition-opacity duration-300 group-hover/s:opacity-100" />
                <span className={`text-stat font-bold tabular-nums ${TONE[f.tone]}`}>{f.code}</span>
                <span aria-hidden="true" className="h-[1.8em] w-px skew-blade bg-blade-copper opacity-40 transition-opacity duration-300 group-hover/s:opacity-100" />
                <span className="flex min-w-0 items-baseline gap-[1.1em]">
                  <span className="text-body tabular-nums text-blade-rose max-md:text-caption">{f.height}</span>
                  <span className={`truncate text-subhead font-medium transition-transform duration-300 ease-out group-hover/s:translate-x-[6px] max-md:text-body ${TONE[f.tone]}`}>
                    {f.name}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      );
//font for 4 page
    case 'grid':
      return (
        <div data-rise className="grid grid-cols-4 gap-[2em] max-lg:grid-cols-2">
          {slide.grid.map((col, i) => (
            <div key={col.heading} className="relative flex min-w-0 flex-col gap-[0.7em]">
              {i > 0 && (
                <span aria-hidden="true" className="absolute -left-[1em] top-0 h-full w-px bg-blade-ink max-lg:hidden" />
              )}
              {/* PHONE TEXT FIX: max-md:text-[0.625rem] on both the heading and the
                  list items — this slide packs 4 columns of copy, and on phone it
                  collapses to a single column (max-lg:grid-cols-2 further up doesn't
                  reach 1 column, so this is carrying more rows per screen than desktop). */}
              <h2 className="text-[calc(var(--text-caption)*1.02)] font-bold uppercase tracking-[0.24em] text-blade-copper 4xl:text-[1.275rem] 6xl:text-[1.35rem] max-md:text-[0.625rem]">{col.heading}</h2>
              <ul className="flex flex-col">
                {col.items.map((item) => (
                  <li key={item} className="border-t border-blade-ink py-[0.45em] text-[calc(var(--text-caption)*1.051)] text-blade-cream/85 3xl:text-[calc(var(--text-caption)*1.091)] 4xl:text-[1.275rem] 6xl:text-[1.35rem] max-md:text-[0.625rem]">
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
        // PHONE TEXT FIX: max-md:text-[0.625rem] on both dt and dd. This is the
        // densest slide kind (6 label/value rows, values often wrapping to 2 lines) —
        // it was the one that read as cramped on a phone screenshot, so it gets the
        // smallest step down of any text in this file.
        <dl data-rise className="grid grid-cols-[minmax(0,15em)_1fr] content-start gap-x-[2.4em] max-md:grid-cols-1">
          {slide.rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="border-t border-blade-ink py-[0.5em] text-caption uppercase tracking-[0.16em] text-blade-rose 4xl:text-xl 6xl:text-2xl max-md:text-[0.625rem]">
                {row.label}
              </dt>
              <dd className="border-t border-blade-ink py-[0.5em] text-[calc(var(--text-caption)*1.01)] text-blade-cream max-md:border-t-0 max-md:pt-0 4xl:text-xl 6xl:text-2xl max-md:text-[0.625rem]">
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
          {/* PHONE OVERFLOW FIX: this was max-md:grid-cols-1 — with an 11-item list split
              into two halves for two desktop columns, collapsing to one column on phone
              stacked both halves (11 rows instead of 6) and ran the list past the bottom
              of the frame, clipping the last item. Staying at grid-cols-2 on phone too
              (same pattern as the 'columns' and 'grid' slide kinds, which never collapse
              past 2) keeps it to 6 rows tall instead. */}
          <div data-rise className="grid grid-cols-2 gap-x-[3em] max-md:gap-x-[1em]">
            {[slide.items.slice(0, half), slide.items.slice(half)].map((col, ci) => (
              <ul key={ci} className="flex min-w-0 flex-col">
                {col.map((m) => (
    // font size for features sustainability — PHONE TEXT FIX: max-md:text-[0.625rem] added
                  <li key={m} className="border-t border-blade-ink py-[0.5em] text-[calc(var(--text-caption)*1.03)] text-blade-cream/80 3xl:text-[calc(var(--text-caption)*1.04)] 4xl:text-[1.475rem] 6xl:text-[1.55rem] max-md:text-[0.625rem]">
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
          {/* PHONE TEXT FIX: max-md:text-caption added */}
          <p data-rise className="max-w-[58ch] text-body text-blade-cream/80 max-md:text-caption">{slide.body}</p>
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
          {/* PHONE TEXT FIX: max-md:text-caption added */}
          <p data-rise className="max-w-[58ch] text-body text-blade-cream/80 max-md:text-caption">{slide.body}</p>
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

  // The arrow keys below only fire while this element has focus, and nothing put focus
  // here otherwise — a mouse click did on a desktop that happened to land inside the
  // frame, but a laptop that only ever used the keyboard (or arrived via the rail /
  // section nav) left focus wherever it was, so ArrowLeft/Right silently did nothing.
  // A stable ref callback focuses it exactly once, the moment this screen mounts.
  const focusRoot = useCallback((el) => {
    root.current = el;
    el?.focus({ preventScroll: true });
  }, []);

  // The outgoing slide's text fades out and lifts slightly before the index changes —
  // otherwise React would swap the copy instantly and the "disappear" would never be
  // seen. Only once that exit finishes does setIndex mount the next slide, which the
  // useGSAP effect below picks up and fades in from below.
  const go = useCallback((next, delta) => {
    if (busy.current) return;
    busy.current = true;
    setDir(delta);

    const el = root.current;
    const lines = el ? el.querySelectorAll('[data-line] > *') : [];
    const rises = el ? el.querySelectorAll('[data-rise]') : [];
    const rule = el?.querySelector('[data-slide-rule]');
    const exiting = [...lines, ...rises];

    gsap.killTweensOf([...exiting, rule].filter(Boolean));
    const exit = gsap.timeline({ onComplete: () => setIndex(next) });
    exit.to(exiting, { y: -20, autoAlpha: 0, duration: 0.32, stagger: 0.015, ease: E.in, overwrite: 'auto' }, 0);
    if (rule) exit.to(rule, { autoAlpha: 0, duration: 0.28, ease: E.in, overwrite: 'auto' }, 0);

    gsap.delayedCall(1.2, () => {
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
  // drift, the heading lines rise up from below while fading in, the rule draws, and the
  // body parts follow the same rise-and-fade behind it. killTweensOf first, so running
  // the deck fast never leaves two slides animating over each other.
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

      gsap.set(lines, { y: 60, autoAlpha: 0 });
      gsap.set(rises, { y: 60, autoAlpha: 0 });
      gsap.set(rule, { scaleX: 0, autoAlpha: 1, transformOrigin: dir > 0 ? 'left center' : 'right center' });

      gsap
        .timeline({ defaults: { overwrite: 'auto' } })
        .to(lines, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.12, ease: 'power2.out' }, 0.2)
        .to(rule, { scaleX: 1, duration: 0.9, ease: 'power2.out' }, 0.6)
        .to(rises, { y: 0, autoAlpha: 1, duration: 1.4, stagger: 0.1, ease: 'power2.out' }, 0.75);
    },
    { dependencies: [index, dir], scope: root },
  );

  return (
    <Screen id="features" padded={false}>
      <div
        ref={focusRoot}
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
              {/* BACKGROUND IMAGE FIX: object-cover (an object-fit value) is already
                  applied — it's what fills this full-bleed backdrop edge-to-edge on any
                  screen without stretching the render. object-center is now explicit
                  too, so the crop stays centred on the building rather than drifting to
                  whatever the browser's default anchor happens to be on a narrow phone.

                  PHONE CROP FIX: every backdrop here is a landscape render (see the
                  comment atop FEATURE_BACKDROPS in gallery.js), so a phone's tall
                  portrait frame crops hard off the top and bottom to fill it edge to
                  edge. object-contain was tried here but left letterbox gaps, which
                  isn't wanted — this stays object-cover (true fullscreen, no gaps) and
                  instead biases the crop upward with max-md:object-[50%_30%] so the
                  tower/façade stays in frame; the copy overlay already sits in the
                  lower half of the frame, so ceding more of the bottom to the crop
                  costs nothing. */}
              <img
                src={render.src}
                srcSet={render.srcSet}
                sizes="100vw"
                alt=""
                decoding="async"
                loading={i === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover object-center max-md:object-[50%_30%]"
              />
            </div>
          ))}
          {/* Four scrims used to stack here — a flat 55% darkening, a left gradient that
              was still at 30% on the right edge, a vignette and the sheen — and together
              they buried the render. On the darker slides the image was simply not there.

              The left-to-right gradient below is now a whisper (5% at its darkest,
              fading out by the right third) rather than a real darkening: the render is
              meant to read clearly through the copy, at the cost of some of the copy's
              own contrast on a bright slide. */}
          <div className="absolute inset-0 z-[5] bg-blade-black/20" />
          <div
            className="absolute inset-0 z-[5]"
            style={{
              background:
                'linear-gradient(90deg, rgb(var(--scrim-rgb) / 0.9) 0%, rgb(var(--scrim-rgb) / 0.78) 30%, rgb(var(--scrim-rgb) / 0.35) 60%, rgb(var(--scrim-rgb) / 0) 88%)',
            }}
          />
          {/* Seats the chrome, top and bottom. Nothing more than that. */}
          <div
            className="absolute inset-0 z-[5]"
            style={{
              background:
                'linear-gradient(180deg, rgb(var(--scrim-rgb) / 0.6) 0%, transparent 17%, transparent 80%, rgb(var(--scrim-rgb) / 0.62) 100%)',
            }}
          />
          <div className="sheen-soft absolute inset-0 z-[5]" />
        </div>

        <SectionTitle id="features" />

        <div className="flex min-h-0 flex-col justify-center gap-[1.1em] overflow-hidden">
          <div className="flex max-w-[74%] flex-col gap-[0.5em] max-lg:max-w-none">
            <span data-line className="block">
              <span className="block text-caption uppercase tracking-[0.34em] text-blade-copper">
                {slide.eyebrow}
              </span>
            </span>
            {slide.headline.map((l) => (
              <span key={l} data-line className="block">
                <span className="block text-headline uppercase text-blade-cream max-md:text-subhead">{l}</span>
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
