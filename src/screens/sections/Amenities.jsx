import { useCallback, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { ArrowIcon } from '../../components/Icons';
import { getRender } from '../../data/renders';
import { AMENITY_GALLERY } from '../../data/gallery';
import { gsap, useGSAP, Observer, E } from '../../gsap/Gsapconfig';

// A curated running order, not "everything in renders.js" — see src/data/gallery.js.
const RENDERS = AMENITY_GALLERY.map(getRender).filter(Boolean);

// Every image is shown WHOLE. object-contain, always — on a phone held upright, on a
// laptop, on a 4K screen, for a portrait render or a landscape one. Cropping was the
// wrong call: these are the client's renders and the composition is the point.
//
// What fills the rest of the frame is the same image again, blown up and blurred behind
// the sharp one, with the copper sheen over it. It reads as a lit room rather than as
// letterboxing, and it works for any aspect ratio without a special case.
//
// The change itself is a blade wipe: a 12° copper edge sweeps the frame and the next
// render is revealed behind it, while the outgoing one drifts back and the backdrop
// cross-fades under both.

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
      setIndex((i) => (i + delta + total) % total); // wraps both ways
      gsap.delayedCall(1.15, () => {
        busy.current = false;
      });
    },
    [total],
  );

  // Swipe on any touch or pointer device, plus the arrow keys.
  useGSAP(
    () => {
      const o = Observer.create({
        target: root.current,
        type: 'touch,pointer',
        dragMinimum: 30,
        tolerance: 40,
        onLeft: () => move(1),
        onRight: () => move(-1),
      });
      return () => o.kill();
    },
    { dependencies: [move], scope: root },
  );

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const edge = el.querySelector('[data-wipe-edge]');
      gsap.killTweensOf(edge);

      for (const frame of el.querySelectorAll('[data-frame]')) {
        const i = Number(frame.dataset.frame);
        const on = i === index;
        const sharp = frame.querySelector('[data-sharp]');
        const blur = frame.querySelector('[data-blur]');
        gsap.killTweensOf([frame, sharp, blur]);

        if (on) {
          gsap.set(frame, { zIndex: 2, autoAlpha: 1 });
          // The incoming frame is revealed by the wipe, not by a fade.
          gsap.set(frame, { '--wipe': dir > 0 ? 112 : -124 });
          gsap.set(sharp, { scale: 1.1, xPercent: dir > 0 ? 2.5 : -2.5 });
          gsap.set(blur, { scale: 1.28, autoAlpha: 0 });

          gsap
            .timeline()
            .to(frame, { '--wipe': -12, duration: 1.15, ease: E.out }, 0)
            .to(sharp, { scale: 1, xPercent: 0, duration: 1.6, ease: E.out }, 0)
            .to(blur, { autoAlpha: 1, scale: 1.16, duration: 1.4, ease: E.out }, 0);
        } else {
          gsap.set(frame, { zIndex: 1 });
          gsap.to(frame, { autoAlpha: 0, duration: 0.75, ease: E.in, overwrite: 'auto' });
          // The outgoing one drifts back rather than simply vanishing.
          gsap.to(sharp, {
            scale: 0.96,
            xPercent: dir > 0 ? -2 : 2,
            duration: 1.1,
            ease: E.out,
            overwrite: 'auto',
          });
        }
      }

      // The copper edge rides across with the wipe and leaves.
      if (edge) {
        gsap.set(edge, { left: dir > 0 ? '112%' : '-12%', autoAlpha: 0 });
        gsap
          .timeline()
          .to(edge, { autoAlpha: 1, duration: 0.18 }, 0)
          .to(edge, { left: dir > 0 ? '-12%' : '112%', duration: 1.15, ease: E.out }, 0)
          .to(edge, { autoAlpha: 0, duration: 0.22 }, 0.95);
      }
    },
    { dependencies: [index, dir], scope: root },
  );

  return (
    <Screen id="amenities" padded={false}>
      <div
        ref={root}
        className="relative h-full w-full touch-pan-y"
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
        {RENDERS.map((render, i) => (
          <figure
            key={render.id}
            data-frame={i}
            aria-hidden={i !== index}
            // Inactive frames start hidden in CSS, before GSAP runs at all — otherwise
            // the first paint stacks every render on top of the next.
            data-overflow-ok
            className={`blade-wipe absolute inset-0 m-0 overflow-hidden ${
              i === index ? '' : 'invisible opacity-0'
            }`}
          >
            {/* The same render, blown up and blurred, filling whatever the contained
                image does not. */}
            <img
              data-blur
              data-overflow-ok
              src={render.src}
              alt=""
              aria-hidden="true"
              decoding="async"
              loading={i === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 h-full w-full scale-[1.2] object-cover blur-[42px] saturate-[1.15]"
            />
            <div aria-hidden="true" className="sheen-soft absolute inset-0" />
            <div aria-hidden="true" className="absolute inset-0 bg-blade-black/45" />

            <img
              data-sharp
              src={render.src}
              srcSet={render.srcSet}
              sizes="100vw"
              width={render.width}
              height={render.height}
              alt={render.alt}
              decoding="async"
              loading={i === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </figure>
        ))}

        <span data-wipe-edge aria-hidden="true" className="blade-wipe-edge z-[6] opacity-0" />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'linear-gradient(180deg, rgb(11 8 7 / 0.72) 0%, transparent 20%, transparent 70%, rgb(11 8 7 / 0.84) 100%)',
          }}
        />

        <div className="screen-inset pointer-events-none absolute inset-0 z-20 grid grid-rows-[auto_1fr_auto]">
          <SectionTitle id="amenities" />
          <span />

          <div className="flex items-end justify-between gap-[2em] max-md:justify-end">
            <ol className="pointer-events-auto flex items-end gap-[0.45em] max-md:hidden">
              {RENDERS.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (i === index || busy.current) return;
                      const fwd = (i - index + total) % total;
                      move(fwd <= total / 2 ? fwd : fwd - total);
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
              <button type="button" onClick={() => move(-1)} aria-label="Previous render" className="group/n text-blade-cream">
                <ArrowIcon size="1.6em" className="rotate-180 transition-transform duration-300 ease-out group-hover/n:-translate-x-[5px]" />
              </button>
              <button type="button" onClick={() => move(1)} aria-label="Next render" className="group/n text-blade-cream">
                <ArrowIcon size="1.6em" className="transition-transform duration-300 ease-out group-hover/n:translate-x-[5px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only" aria-live="polite">{`Render ${index + 1} of ${total}`}</span>
      <span className="sr-only">{active.alt}</span>
    </Screen>
  );
}
