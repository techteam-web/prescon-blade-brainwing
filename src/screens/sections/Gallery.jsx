import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { ArrowIcon, FullscreenIcon, CloseIcon } from '../../components/Icons';
import { getRender } from '../../data/renders';
import { GALLERY_RENDERS, GALLERY_CAPTIONS, GALLERY_STOCK_IDS } from '../../data/gallery';
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
  const busy = useRef(false);
  const total = RENDERS.length;
  const active = RENDERS[index];

  // "Maximise" is a viewport-covering overlay, NOT Element.requestFullscreen().
  //
  // It used to be the real API, and that was wrong on every engine for the same reason
  // it was broken on WebKit: by the time anyone can reach this screen the app is ALREADY
  // in fullscreen — LAW 2's gate fullscreens <html> and freezes everything behind a
  // modal the moment fullscreen is lost, so the gallery is only ever interactive while
  // the viewport is the whole display. A second, nested request therefore buys no extra
  // pixels; all it does is hand the browser a case the engines disagree about:
  //
  //   • WebKit does not honour a fullscreen request for a descendant while an ancestor
  //     is already the fullscreen element — it fails, the `.catch(() => {})` below
  //     swallowed it, and the button did nothing. That is the Safari bug.
  //   • Even where it is honoured, WebKit's exitFullscreen() pops the WHOLE stack
  //     rather than one level, so closing the maximised render dropped the app out of
  //     LAW-2 fullscreen and put the gate back up over the gallery.
  //   • iOS Safari has no element Fullscreen API at all, on any version.
  //
  // One overlay covers all three, behaves identically everywhere, and needs no feature
  // detection or vendor prefixes.
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  // Escape closes it. The keydown handler on the carousel root can't be relied on here:
  // the overlay is portaled to <body>, so whether a key event reaches that root depends
  // on where focus happens to be, and on a touch device nothing focuses it at all.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setFullscreen(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [fullscreen]);

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

  // Shared between the in-place frame and the portaled maximised one below — same mat,
  // mask and toggle button either way, just a different box around them.
  const frameInner = (
    <>
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

      {/* Expands the render to cover the viewport (see toggleFullscreen), and the same
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
    </>
  );

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
          else if (e.key === 'Escape' && fullscreen) setFullscreen(false);
          else return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* The framed print: a bordered mat around the render, nearly full width — see
            the reference screenshot's own red-boxed frame — rather than the full-bleed
            treatment Amenities and Views use. Every render is shown WHOLE inside it —
            object-contain, same reasoning as before, just inside a box instead of the
            full screen — and the LQIP fills whatever the mat doesn't.

            The caption plate sits directly under the frame rather than overlaid as
            page chrome, the way a museum label sits under the print, not on it — a
            title (curated in GALLERY_CAPTIONS, src/data/gallery.js) over the fixed
            "Artist's Impression" tag, and the counter/arrows moved down to sit on the
            same rule instead of floating at the screen's own corner. Both frame and
            plate are direct children of this flex COLUMN (not nested inside an
            auto-height wrapper) specifically so the frame's max-h percentage below
            still resolves against this container's own definite height, the same way
            it did before the plate existed. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[0.9em] max-md:gap-[0.6em]">
          {!fullscreen && (
            <>
              <div className="relative aspect-[3/2] w-[58%] max-h-[62%] bg-blade-black max-md:aspect-[4/3] max-md:w-[92%] max-md:max-h-none">
                {frameInner}
              </div>

              <div className="flex w-[58%] items-end justify-between gap-[1.5em] max-md:w-[92%]">
                <div className="flex min-w-0 items-stretch gap-[0.9em]">
                  <span aria-hidden="true" className="w-[3px] shrink-0 bg-blade-copper" />
                  <div className="flex min-w-0 flex-col justify-center gap-[0.2em]">
                    <span className="truncate text-subhead font-medium uppercase text-blade-cream max-md:text-body">
                      {GALLERY_CAPTIONS[active.id] ?? ''}
                    </span>
                    <span className="truncate text-caption uppercase tracking-[0.3em] text-blade-copper max-md:text-[0.625rem]">
                      {GALLERY_STOCK_IDS.has(active.id) ? 'Stock Image' : "Artist's Impression"}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-[1.4em]">
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
            </>
          )}
        </div>

        {/* The maximised view is portaled to <body> rather than just switched to `fixed`
            in place — this screen sits deep inside GSAP's transition tree, and any
            ancestor there with a live transform (routine for it, even at rest) becomes
            a containing block for `position: fixed`, trapping it exactly the way a
            `filter` would (see the gate's own sibling-of-frozen-layer comment in
            FullscreenGate.jsx — same class of bug). A portal sidesteps every such
            ancestor instead of auditing all of them. No caption plate here — a true
            fullscreen view is meant to be just the image. */}
        {fullscreen &&
          createPortal(
            <div
              className="fixed inset-0 z-[190] bg-blade-black"
            >
              {frameInner}
            </div>,
            document.body,
          )}

        {/* Section title only now — the counter and arrows moved down to the caption
            plate under the frame. */}
        <div className="screen-inset pointer-events-none absolute inset-0 z-20">
          <SectionTitle id="gallery" />
        </div>
      </div>

      <span className="sr-only" aria-live="polite">{`Render ${index + 1} of ${total}`}</span>
      <span className="sr-only">{active.alt}</span>
    </Screen>
  );
}
