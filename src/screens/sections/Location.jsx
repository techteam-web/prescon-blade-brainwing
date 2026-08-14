import { useCallback, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { BladeMap } from '../../features/map/BladeMap';
import { formatDistance, travelTimes } from '../../features/map/routing';
import { CONNECTIVITY } from '../../data/connectivity';
import { CONTENT } from '../../data/content';
import { gsap, useGSAP, E } from '../../gsap/Gsapconfig';
import { useApp } from '../../app/appContext';

// No sheen: the map is the subject, and a copper wash over it would fight the corridor
// colours that carry all the meaning.
//
// Layout is deliberately different by size. On a wide screen the panel floats over the
// map on the left. On a phone the map gets the whole upper half and the panel docks to
// the bottom — the map is what people came to look at, and a floating panel on a 375px
// screen covers most of it.
const TONE = {
  cream: 'text-blade-cream',
  copper: 'text-blade-copper',
  terracotta: 'text-blade-terracotta',
  rose: 'text-blade-rose',
};

function Directions({ route }) {
  const box = useRef(null);

  useGSAP(
    () => {
      if (!box.current) return;
      gsap.killTweensOf(box.current);
      gsap.set(box.current, { y: 14, autoAlpha: 0 });
      gsap.to(box.current, { y: 0, autoAlpha: 1, duration: 0.55, ease: E.out, overwrite: 'auto' });
    },
    { dependencies: [route?.id, route?.state] },
  );

  if (!route) return null;

  return (
    <div ref={box} className="shrink-0 border-t border-blade-ink/70 pt-[0.7em]">
      <div className="flex items-baseline justify-between gap-[0.8em]">
        <span className="min-w-0 truncate text-[0.68rem] font-medium uppercase tracking-[0.14em] text-blade-cream">
          {route.label}
        </span>
        {route.state === 'ready' ? (
          <span className="shrink-0 text-[0.68rem] font-medium tabular-nums text-blade-copper">
            {formatDistance(route.distance)}
          </span>
        ) : null}
      </div>

      {route.state === 'loading' ? (
        <p className="pt-[0.4em] text-[0.6rem] text-blade-cream/55">Finding the route…</p>
      ) : null}
      {route.state === 'error' ? (
        <p className="pt-[0.4em] text-[0.6rem] text-blade-cream/55">
          Route unavailable right now.
        </p>
      ) : null}

      {route.state === 'ready' ? (
        <ul className="grid grid-cols-4 gap-[0.4em] pt-[0.6em]">
          {travelTimes(route).map((m) => (
            <li key={m.id} className="flex min-w-0 flex-col gap-[0.15em]">
              <span className="text-[0.55rem] uppercase tracking-[0.14em] text-blade-cream/50">
                {m.label}
              </span>
              <span className="truncate text-[0.66rem] tabular-nums text-blade-cream">
                {m.time}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {route.state === 'ready' ? (
        <p className="pt-[0.5em] text-[0.52rem] leading-[1.3] text-blade-cream/40">
          Driving time is routed. Metro, bus and walking are estimates from the road
          distance.
        </p>
      ) : null}
    </div>
  );
}

export function Location() {
  const c = CONTENT.location;
  const [category, setCategory] = useState(null);
  const [focus, setFocus] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [route, setRoute] = useState(null);
  const panel = useRef(null);
  const { isTransitioning } = useApp();

  const onRoute = useCallback((r) => setRoute(r), []);

  useGSAP(() => {
    gsap.set(panel.current, { y: 26, autoAlpha: 0 });
    gsap.to(panel.current, { y: 0, autoAlpha: 1, duration: 0.85, delay: 0.2, ease: E.out });
  }, []);

  void isTransitioning;

  const rows = category
    ? CONNECTIVITY.filter((r) => r.cat === category || r.cat === 'node')
    : CONNECTIVITY;

  return (
    <Screen id="location" padded={false}>
      {/* On a phone the map owns the top 52% and the panel sits beneath it, so nothing
          ever covers the thing being explained. */}
      <div className="absolute inset-0 z-0 max-md:bottom-[48%]">
        <BladeMap
          activeCategory={category}
          focusId={focus}
          highlightId={highlight}
          onRoute={onRoute}
        />
      </div>

      <div
        ref={panel}
        className="glass absolute z-10 top-[calc(var(--screen-margin)+var(--chrome-top))] left-[var(--screen-margin)] flex max-h-[64%] w-[clamp(15rem,19vw,20rem)] min-w-0 flex-col gap-[0.8em] overflow-hidden p-[1.1em] max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:max-h-[48%] max-md:w-auto max-md:rounded-none max-md:border-x-0 max-md:border-b-0 max-md:p-[1em] max-md:pb-[calc(var(--screen-margin)+var(--chrome-bottom))]"
      >
        <div className="flex items-baseline justify-between gap-[1em] max-md:hidden">
          <SectionTitle id="location" />
        </div>

        <div
          role="group"
          aria-label="Filter landmarks"
          className="flex shrink-0 flex-wrap gap-x-[0.8em] gap-y-[0.25em]"
        >
          {c.filters.map((f) => {
            const on = category === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(on ? null : f.id)}
                className={`group/f relative pb-[0.25em] text-[0.58rem] uppercase tracking-[0.16em] ${
                  on ? TONE[f.tone] : 'text-blade-cream/45'
                }`}
              >
                {f.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-px ${
                    on ? 'bg-blade-copper' : 'bg-blade-ink group-hover/f:bg-blade-copper'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* The one scroll container in the app, and it is a control surface. */}
        <ul
          data-overflow-ok
          className="-mr-[0.5em] flex min-h-0 flex-1 flex-col overflow-y-auto pr-[0.5em]"
        >
          {rows.map((row) => {
            const on = focus === row.id;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setFocus(on ? null : row.id)}
                  onPointerEnter={() => setHighlight(row.id)}
                  onPointerLeave={() => setHighlight(null)}
                  onFocus={() => setHighlight(row.id)}
                  onBlur={() => setHighlight(null)}
                  aria-pressed={on}
                  className="group/r grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-[0.55em] border-t border-blade-ink/60 py-[0.36em] text-left"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-[0.4em] block h-px origin-left bg-blade-copper transition-[width,opacity] duration-300 ease-out ${
                      on
                        ? 'w-[0.9em] opacity-100'
                        : 'w-0 opacity-0 group-hover/r:w-[0.6em] group-hover/r:opacity-70'
                    }`}
                  />
                  <span
                    className={`min-w-0 truncate text-[0.68rem] transition-colors duration-300 ease-out ${
                      on ? 'text-blade-cream' : 'text-blade-cream/75 group-hover/r:text-blade-cream'
                    }`}
                  >
                    {row.label}
                  </span>
                  <span className="shrink-0 text-[0.6rem] tabular-nums text-blade-copper">
                    {row.km.toFixed(1)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <Directions route={route} />
      </div>
    </Screen>
  );
}
