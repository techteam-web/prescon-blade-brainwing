import { useRef, useState } from 'react';
import { gsap, useGSAP, E } from '../../gsap/Gsapconfig';
import { CONTENT } from '../../data/content';

// The brochure's own table pattern, in the app's dark/gold register: cream text on the
// card's own dark ground, a copper hairline grid, header row in Demi, and a solid-copper
// totals row in Bold — the one filled cell in the table. A RESERVED or REFUGE value
// renders in blade-rose with a copper dot on the unit cell.

function Figure({ value, decimals }) {
  const el = useRef(null);
  const prev = useRef(value);

  // Numbers count between values over 0.5s rather than cutting.
  useGSAP(
    () => {
      if (!el.current) return;
      if (value == null) {
        el.current.textContent = '';
        prev.current = null;
        return;
      }
      const box = { v: prev.current ?? value };
      prev.current = value;
      gsap.to(box, {
        v: value,
        duration: 0.5,
        ease: E.out,
        onUpdate: () => {
          if (el.current) el.current.textContent = box.v.toFixed(decimals);
        },
      });
    },
    { dependencies: [value, decimals] },
  );

  return <span ref={el} className="tabular-nums" />;
}

// `unit`/`onUnitChange` let a caller drive the sq.ft/sq.m switch from outside (the
// compare view syncs it across every column); left undefined, the table manages it
// itself, as it always has on the main Floor Plans panel.
export function ReraTable({ plate, className = '', unit: unitProp, onUnitChange }) {
  const [unitState, setUnitState] = useState('sqft');
  const unit = unitProp ?? unitState;
  const setUnit = onUnitChange ?? setUnitState;
  const labels = CONTENT.plans.units;
  const decimals = unit === 'sqm' ? 2 : 0;

  if (!plate) return null;

  const total = unit === 'sqm' ? plate.sqm : plate.total;

  return (
    <div className={`flex flex-col gap-[0.7em] ${className}`}>
      <div className="flex items-baseline justify-between gap-[1.2em]">
        <span className="text-caption font-semibold uppercase tracking-[0.22em] text-blade-copper">
          {CONTENT.plans.tableTitle}
        </span>

        {/* A two-state hairline switch. No pill, no shadow. */}
        <div role="group" aria-label="Units" className="flex items-baseline gap-[0.9em]">
          {['sqft', 'sqm'].map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={unit === key}
              onClick={() => setUnit(key)}
              className={`relative pb-[0.3em] text-caption uppercase tracking-[0.22em] ${
                unit === key ? 'text-blade-cream' : 'text-blade-cream/45'
              }`}
            >
              {labels[key]}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-px origin-left ${
                  unit === key ? 'bg-blade-copper' : 'bg-blade-copper/25'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* A single vertical rule between the two columns, hairline rows (not a boxed
          grid), and a faint zebra tint on every other row for scan-ability. The total
          is the one row that breaks the pattern: a copper wash fading right, standing
          for the number the rest of the table exists to build up to. */}
      <table className="w-full border-collapse text-caption text-blade-cream">
        <caption className="sr-only">
          {plate.label} — RERA carpet area by unit, in {labels[unit]}
        </caption>
        <thead>
          <tr className="border-b border-blade-copper/40">
            <th
              scope="col"
              className="border-r border-blade-copper/20 px-[0.7em] py-[0.35em] text-left font-semibold uppercase tracking-[0.14em] text-blade-copper"
            >
              Unit
            </th>
            <th
              scope="col"
              className="px-[0.7em] py-[0.35em] text-right font-semibold uppercase tracking-[0.14em] text-blade-copper"
            >
              {labels[unit]}
            </th>
          </tr>
        </thead>
        <tbody>
          {plate.units.map((u, i) => (
            <tr
              key={u.u}
              className={`border-b border-blade-copper/15 ${i % 2 ? 'bg-blade-cream/[0.03]' : ''}`}
            >
              <th
                scope="row"
                className="border-r border-blade-copper/20 px-[0.7em] py-[0.3em] text-left font-normal"
              >
                <span className="inline-flex items-center gap-[0.5em]">
                  {u.status ? (
                    <span
                      aria-hidden="true"
                      className="inline-block size-[0.4em] bg-blade-copper"
                    />
                  ) : null}
                  {u.u}
                </span>
              </th>
              <td className="px-[0.7em] py-[0.3em] text-right">
                {u.status ? (
                  <span className="text-blade-rose">{u.status}</span>
                ) : (
                  <Figure value={unit === 'sqm' ? u.sqm : u.sqft} decimals={decimals} />
                )}
              </td>
            </tr>
          ))}
          <tr
            style={{
              background:
                'linear-gradient(to right, var(--color-blade-copper) 0%, rgb(202 142 91 / 0.4) 100%)',
            }}
          >
            <th
              scope="row"
              className="border-r border-blade-black/25 px-[0.7em] py-[0.35em] text-left font-bold uppercase tracking-[0.14em] text-blade-black"
            >
              Total
            </th>
            <td className="px-[0.7em] py-[0.35em] text-right font-bold text-blade-black">
              <Figure value={total} decimals={decimals} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
