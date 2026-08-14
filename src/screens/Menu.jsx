import { useCallback, useRef, useState } from 'react';
import { Screen } from '../layout/Screen';
import { Wordmark } from '../components/Wordmark';
import { SECTIONS } from '../data/sections';
import { renderIdFor } from '../data/renderMap';
import { getRender } from '../data/renders';
import { useApp } from '../app/appContext';
import { gsap, useGSAP, D, E } from '../gsap/Gsapconfig';

// Left: the five sections as a numbered list. Right: a render that cross-fades to the
// hovered section's mapped render.
//
// THE GLITCH THIS FIXES: the render used to be a single <img> keyed on the render id, so
// React unmounted the old image and mounted a new one on every hover. There was no
// cross-fade at all — just a hard swap with a decode gap, and rapid hovering stacked
// half-finished tweens on elements that no longer existed. That is what left previous
// images hanging around.
//
// Now there are exactly TWO layers that never unmount. A hover paints the incoming
// render into whichever layer is currently at the back, then cross-fades the pair. The
// pair is the only thing that ever animates, so there is nothing to leave behind.

function MenuRow({ section, index, onEnter, onSelect, disabled }) {
  const row = useRef(null);
  const { contextSafe } = useGSAP({ scope: row });

  const hover = contextSafe((on) => {
    // overwrite:'auto' kills any in-flight tween on the same property before starting.
    // Without it, sweeping the list leaves every row finishing an animation it should
    // have abandoned — which is what read as the previous item still being there.
    const vars = { ease: E.soft, overwrite: 'auto' };
    gsap.to('[data-menu-index]', { opacity: on ? 1 : 0.35, duration: 0.3, ...vars });
    gsap.to('[data-menu-label]', { x: on ? 10 : 0, duration: D.micro, ...vars });
    gsap.to('[data-row-rule]', { scaleX: on ? 1 : 0, duration: 0.42, ...vars });
    gsap.to('[data-row-blade]', { scaleY: on ? 1 : 0, duration: 0.38, ...vars });
  });

  return (
    <button
      ref={row}
      type="button"
      data-menu-row
      data-section={section.id}
      disabled={disabled}
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
      className="group relative grid w-full grid-cols-[auto_auto_1fr] items-baseline gap-[1.1em] py-[0.7em] text-left"
    >
      <span
        data-menu-index
        data-flip-id={`idx:${section.id}`}
        className="text-caption tabular-nums tracking-[0.28em] text-blade-copper opacity-35"
      >
        {section.no}
      </span>

      {/* The 12° divider between index and label — a state marker, not decoration. */}
      <span
        data-row-blade
        aria-hidden="true"
        className="block h-[1.5em] w-px origin-bottom scale-y-0 skew-blade self-center bg-blade-copper"
      />

      <span className="relative block min-w-0">
        <span
          data-menu-label
          data-flip-id={`ttl:${section.id}`}
          className="block truncate text-subhead font-medium uppercase text-blade-cream"
        >
          {section.label}
        </span>
        <span
          data-row-rule
          aria-hidden="true"
          className="absolute -bottom-[0.32em] left-0 h-px w-full origin-left scale-x-0 bg-blade-copper"
        />
      </span>
    </button>
  );
}

export function Menu() {
  const { goTo, isTransitioning, registerChrome } = useApp();
  const [hovered, setHovered] = useState(SECTIONS[0].id);

  const stack = useRef(null);
  const layers = useRef([]);
  const front = useRef(0); // which of the two layers is currently on top
  const shown = useRef(null); // the render id painted on the front layer

  const menuRef = useCallback((el) => registerChrome('menuRoot', el), [registerChrome]);
  const setLayer = (i) => (el) => {
    layers.current[i] = el;
  };

  const onEnter = useCallback((id) => setHovered(id), []);

  const dress = (layer, render) => {
    const img = layer.querySelector('img');
    img.srcset = render.srcSet;
    img.sizes = '58vw';
    img.src = render.src;
    img.alt = render.alt;
    layer.style.backgroundImage = `url(${render.lqip})`;
  };

  // The cross-fade runs from a keyed effect, not from the event handler: refs are only
  // ever read after commit, and React coalesces a fast sweep across the list into one
  // run per settled hover instead of one per pointer event.
  useGSAP(
    () => {
      const renderId = renderIdFor(hovered) ?? renderIdFor('menu');
      const render = getRender(renderId);
      const [a, b] = layers.current;
      if (!render || !a || !b) return;

      // First paint: seed the front layer with no animation, so the render is simply
      // there while the menu itself is still arriving.
      if (shown.current === null) {
        dress(a, render);
        // Paint the first render but leave it hidden: the transition director reveals
        // [data-menu-visual], so the menu rebuilds itself on every arrival rather than
        // being on screen before its own entrance has played.
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
      gsap.set(back, { zIndex: 2, autoAlpha: 0, scale: 1.04 });
      gsap.set(top, { zIndex: 1 });
      gsap.to(back, { autoAlpha: 1, scale: 1, duration: 0.6, ease: E.out, overwrite: 'auto' });
      gsap.to(top, { autoAlpha: 0, duration: 0.6, ease: E.out, overwrite: 'auto' });

      front.current = 1 - front.current;
      shown.current = renderId;
    },
    {
      dependencies: [hovered],
      scope: stack,
      // React 19 StrictMode runs mount → cleanup → mount, and the cleanup reverts the
      // inline styles the seed paint just set. Without re-arming, the second pass sees
      // `shown` already populated, skips, and leaves both layers at opacity 0.
      revertOnUpdate: false,
    },
  );

  useGSAP(() => () => {
    shown.current = null;
    front.current = 0;
  }, { scope: stack });

  return (
    <Screen id="menu" padded={false} className="sheen">
      <div className="screen-inset grid h-full min-h-0 grid-cols-[42fr_58fr] max-md:grid-cols-1">
        <div ref={menuRef} className="relative z-10 flex min-h-0 flex-col justify-center">
          <Wordmark data-menu-brand className="absolute top-0 left-0 w-[clamp(6rem,8vw,10rem)]" />

          <div className="relative flex min-h-0 gap-[1.6em]">
            {/* The vertical copper rule beside the list, full list height. */}
            <span data-menu-rule aria-hidden="true" className="w-px shrink-0 origin-top bg-blade-copper" />
            <nav className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
              {SECTIONS.map((section, i) => (
                <MenuRow
                  key={section.id}
                  section={section}
                  index={i}
                  onEnter={onEnter}
                  onSelect={(id, idx) => goTo(id, { index: idx })}
                  disabled={isTransitioning}
                />
              ))}
            </nav>
          </div>
        </div>

        <div
          ref={stack}
          data-menu-visual
          className="relative min-h-0 min-w-0 max-md:absolute max-md:inset-0"
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              ref={setLayer(i)}
              data-overflow-ok
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center opacity-0 max-md:opacity-20"
            >
              <img alt="" decoding="async" className="h-full w-full object-cover" />
            </div>
          ))}
          {/* On mobile the render sits behind the list with the scrim over it. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden max-md:block"
            style={{ background: 'var(--scrim-left)' }}
          />
        </div>
      </div>

      <span className="absolute bottom-[var(--screen-margin)] right-[var(--screen-margin)] text-caption text-[#EEE5D2]/70">
        Artistic Impression
      </span>
      <span className="sr-only" aria-live="polite">
        {SECTIONS.find((s) => s.id === hovered)?.label}
      </span>
    </Screen>
  );
}
