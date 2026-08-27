import { useCallback, useEffect, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { ArrowIcon, FullscreenIcon, CloseIcon } from '../../components/Icons';
import { getRender } from '../../data/renders';
import { GALLERY_RENDERS } from '../../data/gallery';
import { gsap, useGSAP, Observer, E, durationScale } from '../../gsap/Gsapconfig';

// The same render carousel as Amenities — see src/data/gallery.js for why
// GALLERY_RENDERS is a separate export rather than a rename of AMENITY_GALLERY.
const RENDERS = GALLERY_RENDERS.map(getRender).filter(Boolean);

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

export function Gallery() {
  // `prev` is the outgoing slot. Exactly two renders are ever mounted, never twelve.
  const [view, setView] = useState({ index: 0, prev: null, dir: 1, token: 0 });
  const { index, prev, dir, token } = view;
  const root = useRef(null);
  const frame = useRef(null);
  const busy = useRef(false);
  const total = RENDERS.length;
  const active = RENDERS[index];

  // The frame itself is the fullscreen target, not the whole page — this is a "look at
  // this render properly" control, not a re-entry into the app's own LAW-2 fullscreen
  // gate. The browser's UA stylesheet stretches whatever element is fullscreened to fill
  // the viewport on its own; nothing here has to size it by hand.
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement === el) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => {});
  }, []);

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
          sizes="70vw"
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
    <Screen id="gallery" padded={false}>
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
        {/* The framed print: a bordered mat around the render, nearly full width — see
            the reference screenshot's own red-boxed frame — rather than the full-bleed
            treatment Amenities and Views use. Every render is shown WHOLE inside it —
            object-contain, same reasoning as before, just inside a box instead of the
            full screen — and the LQIP fills whatever the mat doesn't. Centred in its own
            absolute layer so the title/counter chrome below can overlay the corners
            exactly like every other screen, instead of eating into the frame's own width
            from a dedicated grid column. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={frame}
            className="relative aspect-[3/2] w-[58%] max-h-[70%] bg-blade-black max-md:aspect-[4/3] max-md:w-[92%] max-md:max-h-none"
          >
            <div className="absolute inset-0 border border-blade-copper/55" />
            <div data-overflow-ok className="absolute inset-[1.6%] overflow-hidden">
              {/* The outgoing render sits plainly in the frame. */}
              {prev !== null && prev !== index && slot(prev, 'out')}

              {/* The incoming one is behind a 12° mask that sweeps across to uncover it.
                  RESPONSIVE FIX: data-overflow-ok added here (and on the mat above) — the
                  mask bleeds sideways by 34dvh (see .blade-reveal in base.css) so the
                  skewed edge never shows a cut corner, and is clipped to this frame's own
                  `overflow: hidden` rather than the viewport now that the render sits in a
                  bordered box instead of full-bleed. Without the flag the dev-only LAW 1
                  overflow guard (useOverflowGuard.js) reports it as a violation. */}
              <div data-mask data-overflow-ok className="blade-reveal z-[4]">
                <span aria-hidden="true" className={`blade-wipe-edge ${dir > 0 ? 'left-0' : 'right-0'}`} />
                <div className="blade-reveal-inner">{slot(index, 'in')}</div>
              </div>
            </div>

            {/* The frame itself is the fullscreen target — clicking this expands just the
                render to fill the screen (the browser's UA stylesheet stretches whatever
                element is fullscreened, no manual sizing needed here), and the same
                control closes it again. */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? 'Exit fullscreen' : 'View fullscreen'}
              className="group/fs absolute right-[2.8em] top-[1.5em] z-[5] flex items-center justify-center bg-blade-black/55 p-[0.55em] text-blade-cream/85 transition-colors duration-200 hover:bg-blade-black/75 hover:text-blade-cream"
            >
              {fullscreen ? (
                <CloseIcon size="1.3em" />
              ) : (
                <FullscreenIcon size="1.3em" className="transition-transform duration-200 ease-out group-hover/fs:scale-110" />
              )}
            </button>
          </div>
        </div>

        {/* Chrome overlay: title top-left, counter and arrows bottom-right — the same
            grid every full-bleed screen in the app uses, just with nothing behind it now
            that the render sits inside its own bordered box instead of full-screen. */}
        <div className="screen-inset pointer-events-none absolute inset-0 z-20 grid grid-rows-[auto_1fr_auto]">
          <SectionTitle id="gallery" />
          <span />

          <div className="flex items-end justify-end gap-[2em]">
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
