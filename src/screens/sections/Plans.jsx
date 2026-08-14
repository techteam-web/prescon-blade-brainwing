import { useCallback, useRef, useState } from 'react';
import { Screen } from '../../layout/Screen';
import { SectionTitle } from './SectionShell';
import { TowerElevation } from '../../features/plans/TowerElevation';
import { ReraTable } from '../../features/plans/ReraTable';
import { TOWER_ZONES, ZONE_BY_ID } from '../../data/towerZones';
import { getPlate } from '../../data/floorPlates';
import { getPlan, PLAN_ASSETS } from '../../data/planAssets';
import { CONTENT } from '../../data/content';
import { gsap, useGSAP, E } from '../../gsap/Gsapconfig';
import { useIdleTask } from '../../hooks/useEventListener';

// Tower left ~34%, plan panel right ~66%.
//
// Hover swaps the right panel with a 120ms debounce, so sweeping the pointer up the
// tower does not thrash through nine plate swaps. Click locks the selection. Service and
// amenity floors have no plate and swap to an amenity card instead — the panel is never
// empty.

const DEBOUNCE = 120;
const FIRST = TOWER_ZONES.find((z) => z.plan)?.id ?? TOWER_ZONES[0].id;

// Every plan image is decoded up front, so a plate swap never waits on the network.
function usePreloadPlans() {
  useIdleTask(() => {
    for (const asset of Object.values(PLAN_ASSETS)) {
      const img = new Image();
      img.src = asset.src;
      img.decode?.().catch(() => {});
    }
  });
}

function AmenityCard({ zone }) {
  const panel = CONTENT.amenities.find((a) => a.id === zone.amenity);
  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-[1em] bg-plan-canvas p-[6%] text-blade-cocoa">
      <span className="text-caption uppercase tracking-[0.24em] text-blade-terracotta">
        {zone.floors}
      </span>
      <h2 className="text-headline uppercase">{zone.label}</h2>
      <span aria-hidden="true" className="h-px w-[34%] bg-blade-copper" />
      {panel ? (
        <>
          <p className="max-w-[54ch] text-caption">{panel.body}</p>
          {panel.list ? (
            <ul className="flex flex-wrap gap-x-[1.2em] gap-y-[0.3em]">
              {panel.list.map((item) => (
                <li key={item} className="text-caption text-blade-cocoa/75">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="text-caption text-blade-cocoa/70">
          {zone.service
            ? 'A service level. No leasable floor plate.'
            : 'No floor plate is published for this level.'}
        </p>
      )}
    </div>
  );
}

export function Plans() {
  const [hovered, setHovered] = useState(null);
  const [locked, setLocked] = useState(FIRST);
  const [shown, setShown] = useState(FIRST);
  const timer = useRef(null);
  const frame = useRef(null);

  usePreloadPlans();

  const request = useCallback((id) => {
    window.clearTimeout(timer.current);
    if (!id) return;
    timer.current = window.setTimeout(() => setShown(id), DEBOUNCE);
  }, []);

  const onHover = useCallback(
    (id) => {
      setHovered(id);
      request(id);
    },
    [request],
  );

  const onSelect = useCallback(
    (id) => {
      window.clearTimeout(timer.current);
      setLocked(id);
      setShown(id);
    },
    [],
  );

  // ↑/↓ move between zones, Enter locks.
  const onKeyDown = (event) => {
    const list = TOWER_ZONES;
    const i = list.findIndex((z) => z.id === (hovered ?? locked));
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const next = list[Math.min(list.length - 1, Math.max(0, i + (event.key === 'ArrowUp' ? -1 : 1)))];
      if (next) onHover(next.id);
      event.preventDefault();
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (hovered) onSelect(hovered);
      event.preventDefault();
    }
  };

  // plateSlide, as a layer swap inside the panel.
  useGSAP(
    () => {
      for (const layer of frame.current?.querySelectorAll('[data-plate]') ?? []) {
        const on = layer.dataset.plate === shown;
        gsap.set(layer, { pointerEvents: on ? 'auto' : 'none' });
        gsap.to(layer, {
          autoAlpha: on ? 1 : 0,
          x: on ? 0 : -80,
          clipPath: on ? 'inset(0 0% 0 0)' : 'inset(0 0 0 100%)',
          duration: on ? 0.6 : 0.5,
          ease: on ? E.out : E.in,
        });
      }
    },
    { dependencies: [shown], scope: frame },
  );

  const chip = ZONE_BY_ID[hovered ?? locked];
  const chipPlate = chip?.plan ? getPlate(chip.plan) : null;

  return (
    <Screen id="plans">
      <div className="grid h-full min-h-0 grid-cols-[34fr_66fr] gap-[3%] max-md:grid-cols-1 max-md:grid-rows-[32%_68%]">
        <div className="flex min-h-0 flex-col gap-[1em]">
          <SectionTitle id="plans" />
          <div
            className="relative min-h-0 flex-1"
            role="listbox"
            aria-label="Floors"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerLeave={() => setHovered(null)}
          >
            <TowerElevation
              hoveredId={hovered}
              lockedId={locked}
              onHover={onHover}
              onSelect={onSelect}
            />

            {/* The label chip — one of the three permitted glass surfaces. */}
            {chip ? (
              <div
                className="glass pointer-events-none absolute right-0 flex flex-col gap-[0.2em] px-[0.9em] py-[0.5em]"
                style={{
                  top: `${chip.shape.y + chip.shape.h / 2}%`,
                  transform: 'translateY(-50%)',
                }}
              >
                <span className="whitespace-nowrap text-caption font-medium text-blade-cream">
                  {chip.label}
                </span>
                {chipPlate ? (
                  <span className="whitespace-nowrap text-caption tabular-nums text-blade-copper">
                    {chipPlate.total.toLocaleString('en-IN')} sq.ft RERA carpet
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div ref={frame} className="relative min-h-0 min-w-0">
          {TOWER_ZONES.map((zone) => {
            const plan = getPlan(zone.plan);
            const plate = getPlate(zone.plan);
            return (
              <div
                key={zone.id}
                data-plate={zone.id}
                aria-hidden={shown !== zone.id}
                className="absolute inset-0 grid min-h-0 grid-rows-[auto_1fr_auto] gap-[0.8em] overflow-hidden"
              >
                <h2 className="text-subhead font-medium uppercase text-blade-cream">
                  {plate?.label ?? zone.label}
                </h2>

                {plan ? (
                  <>
                    <div className="relative min-h-0 bg-plan-canvas p-[2.5%]">
                      <img
                        src={plan.src}
                        srcSet={plan.srcSet}
                        sizes="66vw"
                        width={plan.width}
                        height={plan.height}
                        alt={`${plate?.label ?? zone.label} — architectural plan`}
                        decoding="async"
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <ReraTable plate={plate} className="bg-plan-canvas p-[1.4%]" />
                  </>
                ) : (
                  <div className="row-span-2 min-h-0">
                    <AmenityCard zone={zone} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}
