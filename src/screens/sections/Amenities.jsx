import { useCallback, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { ArrowIcon } from '../../components/Icons';
import { getRender } from '../../data/renders';
import { AMENITY_GALLERY, AMENITY_PANEL_BY_RENDER } from '../../data/gallery';
import { CONTENT } from '../../data/content';
import { gsap, useGSAP, Observer, E, durationScale } from '../../gsap/Gsapconfig';

// A curated running order, not "everything in renders.js" — see src/data/gallery.js.
// Each entry carries its render plus, where AMENITY_PANEL_BY_RENDER maps one, the
// client's own copy for that floor (headline, level, body, bullet list) — see
// CONTENT.gallery in src/data/content.js. Renders with no mapped copy (the exteriors)
// get `panel: null` and stay the plain full-bleed slide.
const ITEMS = AMENITY_GALLERY.map((id) => {
  const render = getRender(id);
  if (!render) return null;
  const panelId = AMENITY_PANEL_BY_RENDER[id];
  const panel = panelId ? CONTENT.gallery.find((g) => g.id === panelId) ?? null : null;
  return { render, panel };
}).filter(Boolean);

const RENDERS = ITEMS.map((it) => it.render);
const PANELS = ITEMS.map((it) => it.panel);

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

  // The panel's copy rises in on its own timeline on top of the wipe below — the wipe
  // carries the whole slide (image and panel together, see `slide()`), then these lines
  // stagger up within it. Scoped to the incoming slot only: during the brief overlap
  // before `prev` is cleared, the outgoing slide's own panel is still in the DOM too.
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const nodes = el.querySelectorAll('[data-slot="in"] [data-panel-anim]');
      if (!nodes.length) return;
      gsap.set(nodes, { y: 26, autoAlpha: 0 });
      gsap.to(nodes, {
        y: 0,
        autoAlpha: 1,
        duration: 0.9,
        stagger: 0.08,
        delay: 0.15,
        ease: E.out,
        overwrite: 'auto',
      });
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

  // One slide is the image AND its panel together, so the blade wipe — applied once,
  // around this whole thing, see `data-mask` below — carries both across the frame as a
  // single sweep rather than wiping the image while the panel just cuts to new copy.
  const slide = (i, role) => {
    const render = RENDERS[i];
    const panel = PANELS[i];
    return (
      <div
        key={render.id}
        data-slot={role}
        data-overflow-ok
        className={`absolute inset-0 flex max-md:flex-col ${role === 'in' ? 'z-[3]' : 'z-[2]'}`}
      >
        <div className={`relative h-full w-full ${panel ? 'max-md:h-[54%] md:w-[60%]' : ''}`}>
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

          {/* Slides that carry copy go full-bleed object-cover, filling this column's
              height edge to edge with no letterboxing. Slides with no copy (none right
              now — see AMENITY_GALLERY in src/data/gallery.js — but the branch stays for
              when exteriors are added back) keep object-contain: the render is the whole
              point there and nothing should crop it. */}
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
            className={`absolute inset-0 h-full w-full ${panel ? 'object-cover' : 'object-contain'}`}
          />
        </div>

        {/* The copy panel — the client's own slide layout: level, headline, body, bullet
            list, on a solid ground beside the render. Rides inside the same masked slide
            as the image, so it wipes in with it rather than cutting to new copy. */}
        {panel && (
          <div className="relative flex min-h-0 w-full flex-1 flex-col justify-center gap-[0.9em] overflow-hidden bg-blade-black px-[8%] py-[6%] max-md:px-[7%] max-md:py-[5%] md:w-[40%] md:flex-none md:px-[5%]">
            <div aria-hidden="true" className="sheen-soft absolute inset-0" />
            <div className="relative flex flex-col gap-[0.9em]">
              <span data-panel-anim className="block text-caption uppercase tracking-[0.3em] text-blade-copper">
                {panel.level}
              </span>
              <div className="flex flex-col gap-[0.1em]">
                {panel.headline.map((line) => (
                  <span
                    key={line}
                    data-panel-anim
                    className="block text-headline uppercase text-blade-cream max-md:text-subhead"
                  >
                    {line}
                  </span>
                ))}
              </div>
              <span aria-hidden="true" data-panel-anim className="block h-px w-[20%] bg-blade-copper" />
              <p data-panel-anim className="max-w-[52ch] text-body text-blade-cream/80 max-md:text-caption">
                {panel.body}
              </p>
              {panel.list?.length ? (
                <ul data-panel-anim className="flex flex-col gap-[0.4em] pt-[0.1em]">
                  {panel.list.map((item) => (
                    <li key={item} className="flex items-baseline gap-[0.7em] text-caption text-blade-cream/75">
                      <span aria-hidden="true" className="h-[0.35em] w-[0.35em] shrink-0 rounded-full bg-blade-copper" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        )}
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
        {/* The outgoing slide — image and panel together — sits plainly in the frame. */}
        {prev !== null && prev !== index && slide(prev, 'out')}

        {/* The incoming one is behind a 12° mask that sweeps across the WHOLE slide —
            image and panel together, not the image alone — to uncover it. Wrapping the
            full slide (rather than just the image column) is also what keeps the mask's
            34dvh sideways bleed (see .blade-reveal in base.css) landing off the edge of
            the viewport, same as it always did: there is no interior column boundary
            inside the masked region for it to spill onto.

            RESPONSIVE FIX: data-overflow-ok added here. Both the mask's bleed and the
            LQIP backdrop's 1.14x scale (to hide its own blur edges) are clipped by
            .blade-reveal's own `overflow: hidden` and never actually paint outside the
            screen at any device size, but without this flag the dev-only LAW 1 overflow
            guard (useOverflowGuard.js) reported it as a violation on every viewport, from
            the narrowest flip-phone width to a 3840px 5xl display. Features.jsx's
            backdrop wrapper already carries this same flag for the identical reason. */}
        <div data-mask data-overflow-ok className="blade-reveal z-[4]">
          <span aria-hidden="true" className={`blade-wipe-edge ${dir > 0 ? 'left-0' : 'right-0'}`} />
          <div className="blade-reveal-inner">{slide(index, 'in')}</div>
        </div>

        <div className="screen-inset pointer-events-none absolute inset-0 z-20 grid grid-rows-[1fr_auto]">
          <span />

          <div className="flex items-end justify-between gap-[2em] max-md:justify-end">
            <div className="pointer-events-auto flex flex-col items-start gap-[0.9em]">
              {/* Moved down to sit left-bottom, clear of the busy top edge of the
                  render. Plain text now — no chip backdrop, no pager ticks beneath it —
                  carrying the copper gradient itself instead of flat cream. */}
              <SectionTitle id="amenities" bold gradient />
            </div>

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
