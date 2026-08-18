import { useRef, useState } from 'react';
import { gsap, useGSAP, D, E, prefersReducedMotion } from '../../gsap/Gsapconfig';
import { getPlan } from '../../data/planAssets';
import { getPlate } from '../../data/floorPlates';
import { CloseIcon } from '../../components/Icons';
import { ReraTable } from './ReraTable';

// A single sq.ft/sq.m toggle drives every column — comparing a floor in sq.ft against
// one left in sq.m would be meaningless, so the choice is shared rather than per-table.
//
// Sized in vh, not left to its content: LAW 1 forbids a scroll container anywhere, and
// this panel sits over the Floor Plans screen it never gets to grow past.
export function FloorCompare({ zones, onClose, onRemove }) {
  const root = useRef(null);
  const [unit, setUnit] = useState('sqft');

  useGSAP(
    () => {
      if (!root.current || prefersReducedMotion()) return;
      gsap.from(root.current, { autoAlpha: 0, duration: D.micro, ease: E.soft });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label="Compare floor plates"
      tabIndex={-1}
      onKeyDown={(event) => {
        // preventDefault here, before the event reaches KeyboardNav's window-level
        // Escape handler, is what keeps that handler from also firing goToMenu().
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={onClose}
      className="absolute inset-0 z-20 flex items-center justify-center bg-blade-void/78 p-[3%]"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-[1100px] flex-col gap-[1.4em] border border-blade-ink bg-blade-black-2 p-[2em]"
      >
        <div className="flex items-start justify-between gap-[1em]">
          <h2 className="text-subhead font-medium uppercase text-blade-cream">
            Compare floor plates
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close compare"
            className="shrink-0 text-blade-cream/70 transition-colors duration-200 hover:text-blade-copper"
          >
            <CloseIcon size="1.2em" />
          </button>
        </div>

        <div
          className="grid min-w-0 gap-[1.4em]"
          style={{ gridTemplateColumns: `repeat(${zones.length}, minmax(0, 1fr))` }}
        >
          {zones.map((zone) => {
            const plan = getPlan(zone.plan);
            const plate = getPlate(zone.plan);
            return (
              <div key={zone.id} className="flex min-w-0 flex-col gap-[0.8em]">
                <div className="flex items-start justify-between gap-[0.6em]">
                  <h3 className="truncate text-caption font-semibold uppercase tracking-[0.14em] text-blade-cream">
                    {zone.label}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onRemove(zone.id)}
                    aria-label={`Remove ${zone.label} from compare`}
                    className="shrink-0 text-blade-cream/50 transition-colors duration-200 hover:text-blade-copper"
                  >
                    <CloseIcon size="0.8em" />
                  </button>
                </div>

                {plan ? (
                  <div className="h-[20vh] bg-plan-canvas p-[4%]">
                    <img
                      src={plan.src}
                      srcSet={plan.srcSet}
                      sizes="30vw"
                      width={plan.width}
                      height={plan.height}
                      alt={`${zone.label} — architectural plan`}
                      decoding="async"
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : null}

                <ReraTable
                  plate={plate}
                  unit={unit}
                  onUnitChange={setUnit}
                  className="bg-plan-canvas p-[1.1em]"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
