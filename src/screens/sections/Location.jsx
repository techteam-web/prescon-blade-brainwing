import { useCallback, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { BladeMap } from '../../features/map/BladeMap';
import { CONNECTIVITY } from '../../data/connectivity';
import { CONTENT } from '../../data/content';
import { ROUTE_STYLES, LEGEND } from '../../data/routes';
import { gsap, useGSAP, E } from '../../gsap/Gsapconfig';
import { useApp } from '../../app/appContext';

// No sheen: the map is the subject, and a copper wash over it would fight the corridor
// colours that carry all the meaning.
//
// The panel is deliberately narrow — the map is what people came to look at. The list
// scrolls INSIDE the panel, which is the one place in the app where scrolling is correct:
// it is a control surface, not the page.
const TONE = {
  cream: 'text-blade-cream',
  copper: 'text-blade-copper',
  terracotta: 'text-blade-terracotta',
  rose: 'text-blade-rose',
};

function LegendKey({ id }) {
  const s = ROUTE_STYLES[id];
  const [a, b] = s.dash ?? [];
  return (
    <li className="flex min-w-0 items-start gap-[0.5em]">
      <span className="relative mt-[0.42em] block h-[3px] w-[1.6em] shrink-0" aria-hidden="true">
        {s.casing ? (
          <span className="absolute inset-x-0 top-1/2 block h-[3px] -translate-y-1/2" style={{ background: s.casing }} />
        ) : null}
        <span
          className="absolute inset-x-0 top-1/2 block h-[2px] -translate-y-1/2"
          style={
            s.dash
              ? { backgroundImage: `repeating-linear-gradient(90deg, ${s.color} 0 ${a * 2}px, transparent ${a * 2}px ${(a + b) * 2}px)` }
              : { background: s.color }
          }
        />
      </span>
      <span className="text-[0.58rem] leading-[1.25] tracking-[0.05em] text-blade-cream/65">{s.label}</span>
    </li>
  );
}

export function Location() {
  const c = CONTENT.location;
  const [category, setCategory] = useState(null);
  const [focus, setFocus] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const panel = useRef(null);
  const mapApi = useRef(null);
  const { isTransitioning } = useApp();

  const onReady = useCallback((api) => {
    mapApi.current = api;
    api.resize();
  }, []);

  useGSAP(
    () => {
      if (isTransitioning) return;
      gsap.delayedCall(0.05, () => mapApi.current?.resize());
    },
    { dependencies: [isTransitioning] },
  );

  useGSAP(() => {
    gsap.set(panel.current, { x: -36, autoAlpha: 0 });
    gsap.to(panel.current, { x: 0, autoAlpha: 1, duration: 0.85, delay: 0.2, ease: E.out });
  }, []);

  const rows = category ? CONNECTIVITY.filter((r) => r.cat === category || r.cat === 'node') : CONNECTIVITY;

  return (
    <Screen id="location" padded={false}>
      <div className="absolute inset-0 z-0">
        <BladeMap
          activeCategory={category}
          focusId={focus}
          highlightId={highlight}
          onReady={onReady}
        />
      </div>

      <div
        ref={panel}
        className="glass absolute z-10 top-[calc(var(--screen-margin)+var(--chrome-top))] left-[var(--screen-margin)] flex max-h-[62%] w-[clamp(15rem,19vw,20rem)] min-w-0 flex-col gap-[0.9em] overflow-hidden p-[1.2em] max-md:inset-x-[var(--screen-margin)] max-md:max-h-[54%] max-md:w-auto"
      >
        <SectionTitle id="location" />

        <div
          role="group"
          aria-label="Filter landmarks"
          className="flex flex-wrap gap-x-[0.9em] gap-y-[0.3em]"
        >
          {c.filters.map((f) => {
            const on = category === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(on ? null : f.id)}
                className={`group/f relative pb-[0.25em] text-[0.6rem] uppercase tracking-[0.18em] ${
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
          className="-mr-[0.6em] flex min-h-0 flex-1 flex-col overflow-y-auto pr-[0.6em]"
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
                  className="group/r relative grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-[0.6em] border-t border-blade-ink/60 py-[0.34em] text-left"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-[0.4em] block h-px origin-left bg-blade-copper transition-[width,opacity] duration-300 ease-out ${
                      on ? 'w-[0.9em] opacity-100' : 'w-0 opacity-0 group-hover/r:w-[0.6em] group-hover/r:opacity-70'
                    }`}
                  />
                  <span
                    className={`min-w-0 truncate text-[0.68rem] transition-colors duration-300 ease-out ${
                      on ? 'text-blade-cream' : 'text-blade-cream/75 group-hover/r:text-blade-cream'
                    }`}
                  >
                    {row.label}
                  </span>
                  <span className="shrink-0 text-[0.62rem] tabular-nums text-blade-copper">
                    {row.km.toFixed(1)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <ul className="grid shrink-0 grid-cols-2 gap-x-[0.7em] gap-y-[0.2em] border-t border-blade-ink/60 pt-[0.7em]">
          {LEGEND.map((id) => (
            <LegendKey key={id} id={id} />
          ))}
        </ul>
      </div>
    </Screen>
  );
}
