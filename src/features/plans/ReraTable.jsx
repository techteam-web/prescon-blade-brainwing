import { useRef, useState } from 'react';
import { gsap, useGSAP, E } from '../../gsap/Gsapconfig';
import { CONTENT } from '../../data/content';

// The brochure's own table pattern: ivory ground, cocoa text, plan-line-light hairline
// grid, header row in Demi, totals row in Bold. A RESERVED or REFUGE value renders in
// plan-unit-alt with a copper dot on the unit cell.

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

export function ReraTable({ plate, className = '' }) {
  const [unit, setUnit] = useState('sqft');
  const labels = CONTENT.plans.units;
  const decimals = unit === 'sqm' ? 2 : 0;

  if (!plate) return null;

  const total = unit === 'sqm' ? plate.sqm : plate.total;

  return (
    <div className={`flex flex-col gap-[0.7em] ${className}`}>
      <div className="flex items-baseline justify-between gap-[1.2em]">
        <span className="text-caption font-semibold uppercase tracking-[0.22em] text-blade-cocoa">
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
                unit === key ? 'text-blade-cocoa' : 'text-blade-cocoa/45'
              }`}
            >
              {labels[key]}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-px origin-left ${
                  unit === key ? 'bg-blade-copper' : 'bg-plan-line-light'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <table className="w-full border-collapse text-caption text-blade-cocoa">
        <caption className="sr-only">
          {plate.label} — RERA carpet area by unit, in {labels[unit]}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="border border-plan-line-light px-[0.7em] py-[0.35em] text-left font-semibold uppercase tracking-[0.14em]"
            >
              Unit
            </th>
            <th
              scope="col"
              className="border border-plan-line-light px-[0.7em] py-[0.35em] text-right font-semibold uppercase tracking-[0.14em]"
            >
              {labels[unit]}
            </th>
          </tr>
        </thead>
        <tbody>
          {plate.units.map((u) => (
            <tr key={u.u}>
              <th
                scope="row"
                className="border border-plan-line-light px-[0.7em] py-[0.3em] text-left font-normal"
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
              <td className="border border-plan-line-light px-[0.7em] py-[0.3em] text-right">
                {u.status ? (
                  <span className="text-plan-unit-alt">{u.status}</span>
                ) : (
                  <Figure value={unit === 'sqm' ? u.sqm : u.sqft} decimals={decimals} />
                )}
              </td>
            </tr>
          ))}
          <tr>
            <th
              scope="row"
              className="border border-plan-line-light px-[0.7em] py-[0.35em] text-left font-bold uppercase tracking-[0.14em]"
            >
              Total
            </th>
            <td className="border border-plan-line-light px-[0.7em] py-[0.35em] text-right font-bold">
              <Figure value={total} decimals={decimals} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
