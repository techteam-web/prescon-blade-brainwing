import { useCallback, useRef, useState } from 'react';
import { Screen } from '../layout/Screen';
import { Wordmark } from '../components/Wordmark';
import { SECTIONS } from '../data/sections';
import { MENU_BACKDROPS } from '../data/gallery';
import { getRender } from '../data/renders';
import { useApp } from '../app/appContext';
import { gsap, useGSAP, D, E } from '../gsap/Gsapconfig';

// The render is the whole page, not a picture in a box on the right.
//
// Two full-bleed layers that never unmount. A hover paints the incoming render into
// whichever is at the back, then cross-fades the pair while the incoming one settles out
// of a slow zoom. The pair is the only thing that ever animates, so nothing is left
// behind — which is what used to make this screen feel broken.
//
// Over the render: the copper sheen from page 6, then a left-weighted scrim. Both are
// needed. The sheen is the personality; the scrim is what guarantees the list stays
// readable no matter how bright the render behind it happens to be.

function MenuRow({ section, index, onEnter, onSelect, disabled, active }) {
  const row = useRef(null);
  const { contextSafe } = useGSAP({ scope: row });

  const hover = contextSafe((on) => {
    // overwrite:'auto' kills any in-flight tween on the same property before starting.
    // Without it, sweeping the list leaves every row finishing an animation it should
    // have abandoned — which is what read as the previous item still being there.
    const vars = { ease: E.soft, overwrite: 'auto' };
    gsap.to('[data-menu-index]', { opacity: on ? 1 : 0.7, duration: 0.3, ...vars });
    gsap.to('[data-menu-label]', { x: on ? 14 : 0, duration: D.micro, ...vars });
    // The marker grows from the spine towards the label rather than running off under
    // the render — it points AT the thing it belongs to and stops there.
    gsap.to('[data-row-marker]', { scaleX: on ? 1 : 0, duration: 0.45, ...vars });
    gsap.to('[data-row-glow]', { opacity: on ? 1 : 0, duration: 0.42, ...vars });
  });

  return (
    <button
      ref={row}
      type="button"
      data-menu-row
      data-section={section.id}
      disabled={disabled}
      aria-current={active}
      onPointerEnter={() => {
        onEnter(section.id);
        hover(true);
      }}
      onPointerLeave={() => hover(false)}
      onFocus={() => {
        onEnter(section.id);
        hover(true);
      }}
      onBlur={() => hover(false)}
      onClick={() => onSelect(section.id, index)}
      className="group relative grid w-full grid-cols-[auto_auto_1fr] items-center gap-[1em] py-[0.62em] text-left"
    >
      {/* A soft pool of shade that follows the hovered row, so the label never has to
          compete with whatever is behind it. */}
      <span
        data-row-glow
        data-overflow-ok
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-[0.1em] -left-[1.6em] right-[-2em] -z-10 opacity-0"
        style={{
          background:
            'linear-gradient(90deg, rgb(var(--scrim-rgb) / 0.72) 0%, rgb(var(--scrim-rgb) / 0.5) 45%, transparent 100%)',
        }}
      />

      <span
        data-menu-index
        data-flip-id={`idx:${section.id}`}
        className="text-caption tabular-nums tracking-[0.28em] text-blade-cream opacity-70"
        style={{ textShadow: '0 1px 12px rgb(5 4 3 / 0.95), 0 0 4px rgb(5 4 3 / 0.9)' }}
      >
        {section.no}
      </span>

      {/* The marker: a short 12° blade that grows out of the spine on hover. */}
      <span className="block h-px w-[2.4em] overflow-visible">
        <span
          data-row-marker
          aria-hidden="true"
          className="block h-px w-full origin-left scale-x-0 skew-blade bg-blade-copper"
        />
      </span>

      <span
        data-menu-label
        data-flip-id={`ttl:${section.id}`}
        className="block truncate text-subhead font-medium uppercase text-blade-cream"
        style={{ textShadow: '0 1px 14px rgb(5 4 3 / 0.85), 0 0 3px rgb(5 4 3 / 0.7)' }}
      >
        {section.label}
      </span>
    </button>
  );
}

export function Menu() {
  const { goTo, isTransitioning, registerChrome } = useApp();
  const [hovered, setHovered] = useState(SECTIONS[0].id);

  const stack = useRef(null);
  const layers = useRef([]);
  const front = useRef(0);
  const shown = useRef(null);

  const menuRef = useCallback((el) => registerChrome('menuRoot', el), [registerChrome]);
  const setLayer = (i) => (el) => {
    layers.current[i] = el;
  };

  const onEnter = useCallback((id) => setHovered(id), []);

  const dress = (layer, render) => {
    const img = layer.querySelector('img');
    img.srcset = render.srcSet;
    img.sizes = '100vw';
    img.src = render.src;
    img.alt = render.alt;
    layer.style.backgroundImage = `url(${render.lqip})`;
  };

  // The cross-fade runs from a keyed effect, not from the event handler: refs are only
  // ever read after commit, and React coalesces a fast sweep across the list into one
  // run per settled hover instead of one per pointer event.
  useGSAP(
    () => {
      const renderId = MENU_BACKDROPS[hovered] ?? MENU_BACKDROPS[SECTIONS[0].id];
      const render = getRender(renderId);
      const [a, b] = layers.current;
      if (!render || !a || !b) return;

      if (shown.current === null) {
        dress(a, render);
        gsap.set(a, { autoAlpha: 1, zIndex: 2, scale: 1 });
        gsap.set(b, { autoAlpha: 0, zIndex: 1 });
        shown.current = renderId;
        front.current = 0;
        return;
      }
      if (renderId === shown.current) return;

      const back = layers.current[1 - front.current];
      const top = layers.current[front.current];
      dress(back, render);

      gsap.killTweensOf([back, top]);
      gsap.set(back, { zIndex: 2, autoAlpha: 0, scale: 1.08 });
      gsap.set(top, { zIndex: 1 });
      // The incoming render settles out of a slow zoom, the way the Features backdrops do.
      gsap.to(back, { autoAlpha: 1, duration: 0.7, ease: E.out, overwrite: 'auto' });
      gsap.to(back, { scale: 1, duration: 2.4, ease: E.out, overwrite: 'auto' });
      gsap.to(top, { autoAlpha: 0, duration: 0.7, ease: E.out, overwrite: 'auto' });

      front.current = 1 - front.current;
      shown.current = renderId;
    },
    {
      dependencies: [hovered],
      scope: stack,
      revertOnUpdate: false,
    },
  );

  useGSAP(
    () => () => {
      shown.current = null;
      front.current = 0;
    },
    { scope: stack },
  );

  return (
    <Screen id="menu" padded={false}>
      {/* Full bleed, behind everything. */}
      <div ref={stack} data-menu-visual className="absolute inset-0">
        {[0, 1].map((i) => (
          <div
            key={i}
            ref={setLayer(i)}
            data-overflow-ok
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden bg-cover bg-center opacity-0"
          >
            <img alt="" decoding="async" className="h-full w-full object-cover" />
          </div>
        ))}

        {/* Four layers, in this order, and all of them are doing work:
            1. a flat darkening, so no render can ever be bright enough to lose the list
            2. the page-6 copper sheen, at a strength that actually reads OVER a photo
            3. a left-weighted scrim, which is what the labels genuinely sit on
            4. a top/bottom vignette to seat the chrome */}
        <div aria-hidden="true" className="absolute inset-0 z-[3] bg-blade-black/25" />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[3]"
          style={{
            background:
              'radial-gradient(circle at 0% 0%, rgb(154 96 70 / 0.6) 0%, rgb(127 80 58 / 0.48) 10%, rgb(109 69 51 / 0.36) 18%, rgb(86 55 42 / 0.22) 30%, rgb(var(--scrim-rgb) / 0) 58%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[3]"
          style={{
            background:
              'linear-gradient(90deg, rgb(var(--scrim-rgb) / 0.62) 0%, rgb(var(--scrim-rgb) / 0.48) 26%, rgb(var(--scrim-rgb) / 0.2) 58%, rgb(var(--scrim-rgb) / 0.06) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[3]"
          style={{
            background:
              'linear-gradient(180deg, rgb(var(--scrim-rgb) / 0.45) 0%, transparent 16%, transparent 80%, rgb(var(--scrim-rgb) / 0.45) 100%)',
          }}
        />
      </div>

      <div className="screen-inset relative z-10 grid h-full min-h-0 grid-cols-[minmax(0,42%)_1fr] max-md:grid-cols-1">
        <div ref={menuRef} className="relative flex min-h-0 flex-col justify-center">
          <Wordmark
            data-menu-brand
            className="absolute top-0 left-0 w-[clamp(6rem,8vw,10rem)]"
          />

          <div className="relative flex min-h-0 gap-[1.4em]">
            <span data-menu-rule aria-hidden="true" className="w-px shrink-0 origin-top bg-blade-copper" />
            <nav className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
              {SECTIONS.map((section, i) => (
                <MenuRow
                  key={section.id}
                  section={section}
                  index={i}
                  active={hovered === section.id}
                  onEnter={onEnter}
                  onSelect={(id, idx) => goTo(id, { index: idx })}
                  disabled={isTransitioning}
                />
              ))}
            </nav>
          </div>
        </div>
        <span />
      </div>

  
      <span className="sr-only" aria-live="polite">
        {SECTIONS.find((s) => s.id === hovered)?.label}
      </span>
    </Screen>
  );
}
