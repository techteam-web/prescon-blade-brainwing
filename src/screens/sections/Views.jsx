import { useCallback, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { TimeOfDayPanorama } from '../../features/plans/TimeOfDayPanorama';
import { PANORAMAS, hasPanoramas } from '../../data/panoramas';
import { CONTENT } from '../../data/content';
import { gsap, useGSAP, Observer, E } from '../../gsap/Gsapconfig';

// No sheen: the view IS the page.
//
// A time-of-day rail down the right, a 360° stage filling the screen. Day, evening and
// twilight advance on the arrow keys, a swipe, or the rail itself. Every swap is a masked
// wipe — never a cut.

export function Views() {
  const c = CONTENT.views;
  const [index, setIndex] = useState(0); // open on the day view
  const [dir, setDir] = useState(1);
  const root = useRef(null);
  const stage = useRef(null);
  const busy = useRef(false);
  const active = PANORAMAS[index];

  const settle = () => {
    busy.current = true;
    gsap.delayedCall(0.6, () => {
      busy.current = false;
    });
  };

  const move = useCallback((delta) => {
    if (busy.current) return;
    setIndex((i) => {
      const next = i + delta;
      if (next < 0 || next >= PANORAMAS.length) return i;
      setDir(delta);
      settle();
      return next;
    });
  }, []);

  const jump = useCallback(
    (i) => {
      if (i === index || busy.current) return;
      setDir(i > index ? 1 : -1);
      setIndex(i);
      settle();
    },
    [index],
  );

  // Observer, never a scroll listener — there is no scroller in this app.
  useGSAP(
    () => {
      const o = Observer.create({
        target: root.current,
        type: 'touch',
        dragMinimum: 30,
        tolerance: 40,
        onUp: () => move(1),
        onDown: () => move(-1),
      });
      return () => o.kill();
    },
    { dependencies: [move], scope: root },
  );

  // The stage wipes on every view change. killTweensOf first so a fast run up the rail
  // never leaves two wipes fighting over the same element.
  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      gsap.killTweensOf(el);
      gsap.set(el, {
        clipPath: dir > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)',
        scale: 1.04,
        autoAlpha: 1,
      });
      gsap.to(el, {
        clipPath: 'inset(0% 0 0% 0)',
        scale: 1,
        duration: 1.05,
        ease: E.out,
        overwrite: 'auto',
      });
    },
    { dependencies: [index], scope: stage },
  );

  return (
    <Screen id="views" padded={false}>
      <div
        ref={root}
        className="relative h-full w-full"
        tabIndex={0}
        role="group"
        aria-label="360 degree views by time of day"
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'PageUp') move(1);
          else if (e.key === 'ArrowDown' || e.key === 'PageDown') move(-1);
          else return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div ref={stage} className="absolute inset-0 bg-blade-black">
          {hasPanoramas ? (
            // One persistent viewer for all three times of day (see TimeOfDayPanorama) —
            // switching crossfades between already-loaded scenes instead of tearing down
            // and rebuilding Marzipano, which was the source of the blank flash a plain
            // remount-per-scene approach used to show on every switch.
            <TimeOfDayPanorama scenes={PANORAMAS} activeIndex={index} autorotate />
          ) : (
            // No panorama yet. The slot stays structurally empty rather than showing a
            // flat render dressed up as a 360° view.
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-[1.1em] text-center">
                <span className="text-stat font-bold uppercase text-blade-copper">
                  {active.label}
                </span>
                <span aria-hidden="true" className="h-px w-[7em] skew-blade bg-blade-ink" />
                <span className="max-w-[28ch] text-caption text-blade-cream/45">{c.empty}</span>
              </div>
            </div>
          )}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'linear-gradient(180deg, rgb(var(--scrim-rgb) / 0.72) 0%, transparent 24%, transparent 62%, rgb(var(--scrim-rgb) / 0.8) 100%)',
          }}
        />

        <div className="screen-inset pointer-events-none absolute inset-0 z-20 grid grid-cols-[1fr_auto] grid-rows-[auto_1fr_auto] gap-[1.4em] max-md:grid-cols-1 max-md:grid-rows-[auto_auto_1fr_auto]">
          <SectionTitle id="views" />
          <span className="max-md:hidden" />

          {/* The time-of-day rail: day, evening, twilight, in that order. A vertical list
              pinned to the right on wide screens; on phones it would collide with the
              centred stage content, so it collapses into a horizontal row under the
              title instead. */}
          <ol className="pointer-events-auto col-start-2 row-start-1 row-end-4 flex flex-col justify-center gap-[0.15em] self-center max-md:col-start-1 max-md:row-start-2 max-md:row-end-3 max-md:flex-row max-md:flex-wrap max-md:justify-start max-md:gap-x-[1.1em] max-md:gap-y-[0.3em] max-md:self-auto">
            {PANORAMAS.map((p, i) => {
              const on = i === index;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => jump(i)}
                    aria-current={on}
                    className="group/f flex items-center justify-end gap-[0.8em] py-[0.28em] text-right max-md:justify-start max-md:gap-[0.5em] max-md:py-[0.15em] max-md:text-left"
                  >
                    <span
                      className={`text-subhead font-medium uppercase transition-colors duration-300 ease-out max-md:text-caption [text-shadow:0_1px_3px_rgb(5_4_3_/_0.9),0_0_8px_rgb(5_4_3_/_0.6)] ${
                        on ? 'text-blade-copper' : 'text-blade-cream/45 group-hover/f:text-blade-cream'
                      }`}
                    >
                      {p.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`block h-px origin-right bg-blade-copper transition-[width,opacity] duration-[420ms] ease-out max-md:origin-left ${
                        on
                          ? 'w-[2.6em] opacity-100'
                          : 'w-[0.9em] opacity-40 group-hover/f:w-[1.8em] group-hover/f:opacity-80'
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="col-start-1 row-start-3 flex items-end justify-between gap-[2em] max-md:row-start-4">
            <div className="flex flex-col gap-[0.4em]">
              <span className="text-subhead font-medium uppercase text-blade-cream">
                {active.label}
              </span>
              <span className="text-caption text-blade-cream/60">360° panorama</span>
            </div>
            <span className="shrink-0 text-caption tracking-[0.24em] text-blade-cream/45 max-md:hidden">
              {c.hint}
            </span>
          </div>
        </div>
      </div>
    </Screen>
  );
}
