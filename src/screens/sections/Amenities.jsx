import { useCallback, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { ArrowIcon } from '../../components/Icons';
import { getRender } from '../../data/renders';
import { AMENITY_GALLERY } from '../../data/gallery';
import { gsap, useGSAP, Observer, E, durationScale } from '../../gsap/Gsapconfig';

// A curated running order, not "everything in renders.js" — see src/data/gallery.js.
const RENDERS = AMENITY_GALLERY.map(getRender).filter(Boolean);

// Every image is shown WHOLE. object-contain, always — on a phone held upright, on a
// laptop, on a 4K screen, for a portrait render or a landscape one. Cropping was the
// wrong call: these are the client's renders and the composition is the point.
//
// What fills the rest of the frame is the render's own 24px LQIP, blown up. It is a
// colour field taken from the image itself, so it reads as the room's light spilling
// past the frame — and unlike the full-resolution copy it used to blur, it costs a
// data-URI decode rather than a full-viewport Gaussian.
//
// The change is a blade reveal: a 12° mask sweeps the frame and the next render is
// already behind it. See .blade-reveal in base.css for why this is transform-only —
// the previous version animated clip-path over a live blur, and re-rasterised the
// whole viewport every frame.

const SWEEP = 1.05; // the mask crossing, and the lock that guards it

export function Amenities() {
  // `prev` is the outgoing slot. Exactly two renders are ever mounted, never twelve.
  const [view, setView] = useState({ index: 0, prev: null, dir: 1, token: 0 });
  const { index, prev, dir, token } = view;
  const root = useRef(null);
  const busy = useRef(false);
  const total = RENDERS.length;
  const active = RENDERS[index];

  // The arrow keys below only fire while this element has focus, and nothing put focus
  // here otherwise — a mouse click did on a desktop that happened to land inside the
  // frame, but a laptop that only ever used the keyboard (or arrived via the rail /
  // section nav) left focus wherever it was, so ArrowLeft/Right silently did nothing.
  // A stable ref callback focuses it exactly once, the moment this screen mounts.
  const focusRoot = useCallback((el) => {
    root.current = el;
    el?.focus({ preventScroll: true });
  }, []);

  const move = useCallback(
    (delta) => {
      if (busy.current || !delta) return;
      busy.current = true;
      setView((v) => ({
        index: (v.index + delta + total) % total, // wraps both ways
        prev: v.index,
        dir: delta > 0 ? 1 : -1,
        token: v.token + 1,
      }));
    },
    [total],
  );

  // Swipe, and the arrow keys. lockAxis keeps a vertical flick from being read as a
  // page change, which on a phone is most of what "it goes everywhere" was.
  useGSAP(
    () => {
      const o = Observer.create({
        target: root.current,
        type: 'touch,pointer',
        dragMinimum: 24,
        tolerance: 12,
        lockAxis: true,
        preventDefault: true,
        allowClicks: true,
        onLeft: () => move(1),
        onRight: () => move(-1),
      });
      return () => o.kill();
    },
    { dependencies: [move], scope: root },
  );

  // Keep the neighbours decoded. A reveal that has to wait on an image decode is the
  // one stall the compositor cannot absorb.
  useGSAP(
    () => {
      for (const step of [1, -1, 2]) {
        const r = RENDERS[(index + step + total) % total];
        if (!r) continue;
        const img = new Image();
        img.src = r.src;
        if (img.decode) img.decode().catch(() => {});
      }
    },
    { dependencies: [index], scope: root },
  );

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mask = el.querySelector('[data-mask]');
      const incoming = el.querySelector('[data-slot="in"] [data-sharp]');
      const outgoing = el.querySelector('[data-slot="out"]');
      if (!mask) return;

      const d = SWEEP * durationScale();
      const from = dir > 0 ? 120 : -120;

      // Everything below animates transform or opacity only, so the whole sweep runs on
      // the compositor and nothing in the frame is painted twice.
      gsap.set(mask, { '--reveal': from });
      gsap.set(incoming, { scale: 1.06, xPercent: dir > 0 ? 1.6 : -1.6 });

      const tl = gsap.timeline({
        onComplete: () => {
          busy.current = false;
          // Drop the outgoing slot once it is genuinely finished with.
          setView((v) => (v.prev === null ? v : { ...v, prev: null }));
        },
      });

      tl.to(mask, { '--reveal': 0, duration: d, ease: E.out }, 0).to(
        incoming,
        { scale: 1, xPercent: 0, duration: d * 1.35, ease: E.out },
        0,
      );

      if (outgoing) {
        // The outgoing render settles back rather than simply being covered.
        tl.to(
          outgoing,
          { scale: 0.975, xPercent: dir > 0 ? -1.4 : 1.4, duration: d * 1.1, ease: E.out },
          0,
        ).to(outgoing, { autoAlpha: 0, duration: d * 0.5, ease: E.in }, d * 0.55);
      }

      return () => {
        tl.kill();
        busy.current = false;
      };
    },
    { dependencies: [token], scope: root },
  );

  const slot = (i, role) => {
    const render = RENDERS[i];
    return (
      <div
        key={render.id}
        data-slot={role}
        data-overflow-ok
        className={`absolute inset-0 ${role === 'in' ? 'z-[3]' : 'z-[2]'}`}
      >
        {/* The render's own LQIP, blown up — the colour of the room, not letterboxing.
            Deepened and saturated hard: a 24px thumbnail blown up averages towards mud,
            and on a bright render that mud reads as flat grey card either side of the
            image. Pushed down and warmed, the same pixels read as the room's own light
            falling off past the frame, which is the whole point of it being there. */}
        <img
          data-overflow-ok
          src={render.lqip}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-[1.14] object-cover blur-[26px] brightness-[0.42] saturate-[1.7]"
        />
        <div aria-hidden="true" className="sheen-soft absolute inset-0" />
        <div aria-hidden="true" className="absolute inset-0 bg-blade-black/25" />

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
      </div>
    );
  };

  return (
    <Screen id="amenities" padded={false}>
      <div
        ref={focusRoot}
        className="relative h-full w-full touch-none select-none"
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
        {/* The outgoing render sits plainly in the frame. */}
        {prev !== null && prev !== index && slot(prev, 'out')}

        {/* The incoming one is behind a 12° mask that sweeps across to uncover it. */}
        <div data-mask className="blade-reveal z-[4]">
          <span aria-hidden="true" className={`blade-wipe-edge ${dir > 0 ? 'left-0' : 'right-0'}`} />
          <div className="blade-reveal-inner">{slot(index, 'in')}</div>
        </div>

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
