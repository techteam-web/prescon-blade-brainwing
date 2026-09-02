import { useState } from 'react';
import { FloorPlanOverlay } from './FloorPlanOverlay';
import { MapPinIcon } from '../../components/Icons';
import { EnterPortal } from '../../components/Primitives';
import { getPlan, getPlanSvg } from '../../data/planAssets';
import { ZONE_BY_ID } from '../../data/towerZones';

// The "you are here" card fixed bottom-right on the 360° unit view (see
// UnitPanoramaViewer) — the same traced plate FloorPlanOverlay already draws for the
// floor picker itself, read-only and shrunk into a corner, with the unit actually being
// viewed washed in plan-key gold and pinned. Solid blade-black-2 card, not glass/chip —
// the plan raster's own alpha channel is real (transparent outside the drawn plate, see
// planAssets.js), so it needs an opaque backing regardless of how bright the panorama
// behind it is, same reasoning as the floor picker's own plan card in Plans.jsx.
export function PanoramaFloorRadar({
  zoneId,
  unitId,
  floorLabel,
  viewBearingDeg = null,
  className = '',
  // When given, the mini plan below stops being a read-only "you are here" thumbnail:
  // its rooms become clickable, same affordance as the full-size FloorPlanOverlay in
  // Plans.jsx, and picking one re-frames the still-open panorama onto that room instead
  // of leaving the radar (see onChangeUnit in Plans.jsx).
  onSelectUnit = null,
}) {
  const [hidden, setHidden] = useState(false);
  const zone = ZONE_BY_ID[zoneId];
  const plan = zone?.plan ? getPlan(zone.plan) : null;
  const planSvg = zone?.plan ? getPlanSvg(zone.plan) : null;

  if (!plan || !planSvg) return null;

  return (
    <div
      className={`pointer-events-auto w-[18em] max-w-[62vw] border border-blade-copper/45 bg-blade-black-2/95 p-[0.85em] max-sm:w-[14.5em] max-sm:max-w-[72vw] max-sm:p-[0.65em] ${className}`}
    >
      <div className="flex items-start justify-between gap-[1em] max-sm:gap-[0.6em]">
        {/* No truncate: a full label like "32nd Floor Plan" was clipping to
            "32ND FLO..." at the old, narrower card width — this wraps onto a second
            line instead of hiding the floor number altogether. */}
        <span className="flex min-w-0 items-start gap-[0.5em] text-caption font-medium uppercase tracking-[0.08em] text-blade-cream">
          <MapPinIcon size="0.95em" className="mt-[0.15em] shrink-0 text-blade-copper" />
          <span>{floorLabel} Plan</span>
        </span>
        <EnterPortal
          size="sm"
          icon={null}
          onClick={() => setHidden((v) => !v)}
          aria-label={hidden ? 'Show floor plan' : 'Hide floor plan'}
          className="shrink-0"
        >
          {hidden ? 'Show' : 'Hide'}
        </EnterPortal>
      </div>

      {!hidden ? (
        <div
          className="relative mt-[0.7em] w-full overflow-hidden"
          style={{ aspectRatio: `${plan.width} / ${plan.height}` }}
        >
          <img
            src={plan.src}
            srcSet={plan.srcSet}
            sizes="(max-width: 640px) 62vw, 18em"
            width={plan.width}
            height={plan.height}
            alt={`${floorLabel} — architectural plan`}
            decoding="async"
            loading="lazy"
            className="h-full w-full object-contain"
          />
          <FloorPlanOverlay
            src={planSvg}
            highlightId={unitId}
            viewBearingDeg={viewBearingDeg}
            onSelectUnit={onSelectUnit}
            readOnly={!onSelectUnit}
          />
        </div>
      ) : null}
    </div>
  );
}
