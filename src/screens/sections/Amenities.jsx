import { useCallback, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { ArrowIcon } from '../../components/Icons';
import { RENDERS } from '../../data/renders';
import { gsap, useGSAP, Observer, E } from '../../gsap/Gsapconfig';

// Every render in the project, one at a time, and almost no words.
//
// Orientation decides the treatment:
//   landscape → object-cover, full bleed. The image IS the screen.
//   portrait / square → object-contain, full height, on the copper sheen. Cropping a
//     tall render to a 16:9 screen throws away the thing that makes it tall.
//
// The gallery wraps in both directions, so the arrows never dead-end.
const LANDSCAPE = 1.2;
const isWide = (r) => r.width / r.height >= LANDSCAPE;

export function Amenities() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const root = useRef(null);
  const busy = useRef(false);
  const total = RENDERS.length;
  const active = RENDERS[index];

  const move = useCallback(
    (delta) => {
      if (busy.current) return;
      busy.current = true;
      setDir(delta);
      // Wrap: last → first, first → last.
      setIndex((i) => (i + delta + total) % total);
      gsap.delayedCall(0.8, () => {
        busy.current = false;
      });
    },
    [total],
  );

  useGSAP(
    () => {
      const o = Observer.create({
        target: root.current,
        type: 'touch,pointer',
        dragMinimum: 40,
        tolerance: 60,
        onLeft: () => move(1),
        onRight: () => move(-1),
      });
      return () => o.kill();
    },
    { dependencies: [move], scope: root },
  );

  // One frame in, one frame out. killTweensOf first so running the gallery fast can
  // never leave two frames fighting over the stage.
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      for (const frame of el.querySelectorAll('[data-frame]')) {
        const i = Number(frame.dataset.frame);
        const on = i === index;
        const media = frame.querySelector('[data-media]');
        gsap.killTweensOf([frame, media]);

        if (on) {
          gsap.set(frame, { zIndex: 2, autoAlpha: 1 });
          gsap.set(media, {
            clipPath: dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)',
            scale: 1.08,
            xPercent: dir > 0 ? 3 : -3,
          });
          gsap.to(media, {
            clipPath: 'inset(0 0% 0 0%)',
            scale: 1,
            xPercent: 0,
            duration: 1.25,
            ease: E.out,
            overwrite: 'auto',
          });
        } else {
          gsap.set(frame, { zIndex: 1 });
          gsap.to(frame, { autoAlpha: 0, duration: 0.55, ease: E.in, overwrite: 'auto' });
          gsap.to(media, { scale: 1.05, duration: 0.9, ease: E.out, overwrite: 'auto' });
        }
      }
    },
    { dependencies: [index, dir], scope: root },
  );

  return (
    <Screen id="amenities" padded={false}>
      <div
        ref={root}
        className="relative h-full w-full"
        tabIndex={0}
        role="group"
        aria-label="Renders gallery"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') move(1);
          else if (e.key === 'ArrowLeft') move(-1);
          else return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {RENDERS.map((render, i) => {
          const wide = isWide(render);
          return (
            <figure
              key={render.id}
              data-frame={i}
              aria-hidden={i !== index}
              // Inactive frames start hidden in CSS, before GSAP runs at all — otherwise
              // the first paint stacks every render on top of the next.
              className={`absolute inset-0 m-0 ${i === index ? '' : 'invisible opacity-0'} ${
                wide ? '' : 'sheen'
              }`}
            >
              <img
                data-media
                data-overflow-ok
                src={render.src}
                srcSet={render.srcSet}
                sizes="100vw"
                width={render.width}
                height={render.height}
                alt={render.alt}
                decoding="async"
                loading={i === 0 ? 'eager' : 'lazy'}
                className={`h-full w-full ${wide ? 'object-cover' : 'object-contain'}`}
              />
            </figure>
          );
        })}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'linear-gradient(180deg, rgb(11 8 7 / 0.7) 0%, transparent 22%, transparent 68%, rgb(11 8 7 / 0.82) 100%)',
          }}
        />

        <div className="screen-inset pointer-events-none absolute inset-0 z-20 grid grid-rows-[auto_1fr_auto]">
          <SectionTitle id="amenities" />
          <span />

          <div className="flex items-end justify-between gap-[2em]">
            {/* A tick per render — position at a glance, no wall of text. */}
            <ol className="pointer-events-auto flex items-end gap-[0.45em] max-md:hidden">
              {RENDERS.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (i !== index && !busy.current) move(((i - index + total) % total) <= total / 2 ? i - index : i - index - total);
                    }}
                    aria-label={`Render ${i + 1} of ${total}`}
                    aria-current={i === index}
                    className="group/t block py-[0.7em]"
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-px origin-left bg-blade-copper transition-[width,opacity] duration-[420ms] ease-out ${
                        i === index
                          ? 'w-[3.2em] opacity-100'
                          : 'w-[1.1em] opacity-35 group-hover/t:w-[2em] group-hover/t:opacity-80'
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ol>

            <div className="pointer-events-auto flex items-center gap-[1.4em]">
              <span className="text-caption tabular-nums tracking-[0.3em] text-blade-cream/75">
                {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Previous render"
                className="group/n text-blade-cream"
              >
                <ArrowIcon
                  size="1.6em"
                  className="rotate-180 transition-transform duration-300 ease-out group-hover/n:-translate-x-[5px]"
                />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Next render"
                className="group/n text-blade-cream"
              >
                <ArrowIcon
                  size="1.6em"
                  className="transition-transform duration-300 ease-out group-hover/n:translate-x-[5px]"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {`Render ${index + 1} of ${total}`}
      </span>
      <span className="sr-only">{active.alt}</span>
    </Screen>
  );
}
