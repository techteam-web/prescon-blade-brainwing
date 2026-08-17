import { useState } from 'react';
import { CloseIcon } from '../../components/Icons';
import { getPlate } from '../../data/floorPlates';
import { getPlan } from '../../data/planAssets';
import { ZONE_BY_ID } from '../../data/towerZones';
import { CONTENT } from '../../data/content';

// Side-by-side floor plates, up to three.
//
// It is ALWAYS mounted — hidden, empty, costing nothing — and shown only by GSAP. The
// alternative is mounting it when compare mode opens, which means React tears it down
// the instant the state leaves 'open' and there is nothing left to animate out. Every
// motion in here is driven from Plans.jsx through the data-* markers below.
//
// Each column is two boxes: an outer that clips and an inner that moves. The columns
// rise into view on `transform` alone, so three full-resolution plan drawings animate on
// the compositor rather than repainting a clip-path each frame.
//
// The unit toggle is ONE control for the whole deck, not one per column. Three
// independent sqft/sqm switches sitting side by side would invite exactly the mistake
// this screen exists to prevent — reading two floors in two different units.

function UnitToggle({ unit, onChange, labels }) {
  return (
    <div role="group" aria-label="Units" className="flex shrink-0 items-baseline gap-[0.9em]">
      {['sqft', 'sqm'].map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={unit === key}
          onClick={() => onChange(key)}
          className={`relative pb-[0.3em] text-caption uppercase tracking-[0.22em] transition-colors duration-300 ${
            unit === key ? 'text-blade-cream' : 'text-blade-cream/45 hover:text-blade-cream/80'
          }`}
        >
          {labels[key]}
          <span
            aria-hidden="true"
            className={`absolute inset-x-0 bottom-0 h-px ${
              unit === key ? 'bg-blade-copper' : 'bg-blade-ink'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function Column({ id, index, unit, leader, rows }) {
  const zone = ZONE_BY_ID[id];
  const plate = getPlate(zone?.plan);
  const plan = getPlan(zone?.plan);
  if (!plate || !plan) return null;

  const total = unit === 'sqm' ? plate.sqm : plate.total;
  const decimals = unit === 'sqm' ? 2 : 0;

  return (
    // Outer clips; inner is the only thing that ever moves.
    <div
      data-compare-col
      className="relative flex min-h-0 min-w-0 flex-col overflow-hidden max-md:w-[78vw] max-md:shrink-0 max-md:snap-center"
    >
      <div data-compare-inner className="flex min-h-0 flex-1 flex-col gap-[0.8em]">
        <div className="flex shrink-0 items-baseline gap-[0.7em]">
          <span
            aria-hidden="true"
            className="text-caption tabular-nums tracking-[0.28em] text-blade-copper"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="min-w-0 flex-1 truncate text-subhead font-medium uppercase text-blade-cream">
            {plate.label}
          </h3>
        </div>

        <div className="flex shrink-0 items-baseline justify-between gap-[0.8em] border-t border-blade-ink pt-[0.5em]">
          <span className="text-caption uppercase tracking-[0.18em] text-blade-cream/55">
            RERA carpet
          </span>
          <span
            className={`shrink-0 text-stat font-bold tabular-nums ${
              leader ? 'text-blade-copper' : 'text-blade-cream'
            }`}
          >
            {total.toLocaleString('en-IN', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}
          </span>
        </div>

        <div className="relative min-h-0 flex-1 bg-plan-canvas p-[4%]">
          <img
            src={plan.src}
            srcSet={plan.srcSet}
            sizes="(max-width: 767px) 78vw, 33vw"
            width={plan.width}
            height={plan.height}
            alt={`${plate.label} — architectural plan`}
            decoding="async"
            className="h-full w-full object-contain"
          />
        </div>

        {/* Padded to the deepest unit list in the set, so every plan drawing above sits
            on the same baseline. Without it a four-unit floor squeezes its drawing and a
            one-unit floor stretches its own, and the two are no longer comparable by
            eye — which is the entire job of this screen. */}
        <ul className="flex shrink-0 flex-col">
          {plate.units.map((u) => {
            const value = unit === 'sqm' ? u.sqm : u.sqft;
            return (
              <li
                key={u.u}
                className="flex items-baseline justify-between gap-[0.8em] border-t border-blade-ink py-[0.32em]"
              >
                <span className="min-w-0 truncate text-caption text-blade-cream/75">{u.u}</span>
                <span className="shrink-0 text-caption tabular-nums text-blade-cream">
                  {u.status ? (
                    <span className="text-blade-rose/80">{u.status}</span>
                  ) : (
                    value.toLocaleString('en-IN', {
                      minimumFractionDigits: decimals,
                      maximumFractionDigits: decimals,
                    })
                  )}
                </span>
              </li>
            );
          })}
          {Array.from({ length: Math.max(0, rows - plate.units.length) }, (_, i) => (
            <li
              key={`pad-${i}`}
              aria-hidden="true"
              className="flex items-baseline justify-between gap-[0.8em] border-t border-blade-ink/40 py-[0.32em]"
            >
              <span className="invisible text-caption">—</span>
              <span className="invisible text-caption tabular-nums">—</span>
            </li>
          ))}
        </ul>
      </div>

      {/* The divider between columns is the blade, standing up. */}
      {index > 0 ? (
        <span
          data-compare-rule
          aria-hidden="true"
          className="absolute inset-y-0 left-[-1.4em] w-px origin-top skew-blade bg-blade-copper/45 max-md:hidden"
        />
      ) : null}
    </div>
  );
}

export function CompareDeck({ ids = [], onClose, onEdit }) {
  const [unit, setUnit] = useState('sqft');
  const labels = CONTENT.plans.units;

  // The biggest plate in the set, so the number that answers "which is larger" is the
  // one the eye lands on.
  const leader = ids.reduce(
    (best, id) => {
      const plate = getPlate(ZONE_BY_ID[id]?.plan);
      return plate && plate.total > (best.total ?? -1) ? { id, total: plate.total } : best;
    },
    { id: null, total: null },
  ).id;

  const rows = ids.reduce((max, id) => {
    const plate = getPlate(ZONE_BY_ID[id]?.plan);
    return Math.max(max, plate?.units.length ?? 0);
  }, 0);

  // Visibility is the WRAPPER's job (see Plans.jsx) — this element only lays out.
  return (
    <div data-compare-deck className="flex h-full min-h-0 flex-col gap-[1.2em]">
      <div
        data-compare-bar
        className="flex shrink-0 flex-wrap items-end justify-between gap-x-[1.6em] gap-y-[0.6em]"
      >
        <div className="flex min-w-0 flex-col gap-[0.3em]">
          <span className="eyebrow">Compare</span>
          <h2 className="truncate text-headline uppercase text-blade-cream max-md:text-subhead">
            {ids.length} floor plates
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-[1.6em] max-sm:gap-[1.1em]">
          <UnitToggle unit={unit} onChange={setUnit} labels={labels} />

          <button
            type="button"
            onClick={onEdit}
            className="text-caption uppercase tracking-[0.22em] text-blade-cream/60 transition-colors duration-300 hover:text-blade-copper max-sm:hidden"
          >
            Change selection
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison"
            className="group/c flex items-center gap-[0.6em] text-blade-cream transition-colors duration-300 hover:text-blade-copper"
          >
            <span className="text-caption uppercase tracking-[0.22em] max-sm:sr-only">Close</span>
            <CloseIcon size="1.2em" />
          </button>
        </div>
      </div>

      {/* Below md the columns become a snap track rather than shrinking to unreadable
          slivers. The page still never scrolls — this does, and it is a control. */}
      <div
        data-overflow-ok
        className="grid min-h-0 flex-1 gap-[2.8em] max-md:flex max-md:snap-x max-md:snap-mandatory max-md:gap-[1.2em] max-md:overflow-x-auto max-md:pb-[0.5em]"
        style={{ gridTemplateColumns: `repeat(${Math.max(ids.length, 1)}, minmax(0, 1fr))` }}
      >
        {ids.map((id, i) => (
          <Column
            key={id}
            id={id}
            index={i}
            unit={unit}
            rows={rows}
            leader={id === leader && ids.length > 1}
          />
        ))}
      </div>
    </div>
  );
}
