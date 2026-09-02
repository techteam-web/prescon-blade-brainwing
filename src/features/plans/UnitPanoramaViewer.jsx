import { useEffect, useMemo, useState } from 'react';
import { TiledPanorama } from './TiledPanorama';
import { PanoramaFloorRadar } from './PanoramaFloorRadar';
import { CloseIcon } from '../../components/Icons';
import { EnterPortal } from '../../components/Primitives';
import { resolveUnitView, wrap360 } from './floorPlanRadar';
import { BUILDING_ID, RADAR_OVERRIDES } from '../../data/floorPlanRadarData';

// Opened from a click on a FloorPlanOverlay unit shape (see onOpenView in Plans.jsx).
// Fully unmounted when there is nothing to show — unlike the compare deck, this has no
// entrance choreography of its own to protect, so plain conditional rendering is enough;
// Panorama re-running its mount effect on every open is exactly what resets the view to
// the resolved framing each time rather than resuming wherever the last visit left off.
export function UnitPanoramaViewer({ view, panorama, onClose, onChangeUnit }) {
  useEffect(() => {
    if (!view) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, onClose]);

  // The raw click bearing is only the fallback: a hand-set room/floor/building override
  // in floorPlanRadarData.js wins outright (see resolveUnitView), and even the fallback
  // freezes to the nearest 8-point compass mark, fully fixed — rather than opening at
  // whatever angle the click happened to land on with an accidental free-look tour.
  const unitView = useMemo(() => {
    if (!view || !panorama) return null;
    return resolveUnitView({
      buildingId: BUILDING_ID,
      floorLabel: panorama.label,
      regionName: view.unitId,
      baselineDeg: view.bearingDeg,
      overrides: RADAR_OVERRIDES,
    });
  }, [view, panorama]);

  // floorPlanRadarData.js's yawDeg/panCenterDeg are real compass bearings; TiledPanorama
  // (and Marzipano underneath it) only knows this scene's own raw yaw, which faces
  // whichever way the drone happened to at capture — see northDeg in floorPanoramas.js.
  // This is the one place that translation happens, so every other consumer of
  // resolveUnitView's output stays in honest compass degrees.
  const northDeg = panorama?.northDeg ?? 0;
  const rawYaw = unitView ? wrap360(unitView.yawDeg - northDeg) : null;
  const rawPanCenter = unitView?.panCenterDeg != null ? wrap360(unitView.panCenterDeg - northDeg) : null;

  // The radar's live look-direction cone (PanoramaFloorRadar.jsx) — still the scene's
  // raw frame, same as rawYaw above, translated to a true compass bearing only where
  // it's actually rendered below. TiledPanorama reports into this on every drag/inertia
  // frame; the effect re-freezes it to the opening framing whenever a different unit's
  // view mounts (a new `rawYaw`, driven by TiledPanorama's own `key` change in the JSX
  // below).
  const [liveRawYaw, setLiveRawYaw] = useState(rawYaw);
  useEffect(() => {
    setLiveRawYaw(rawYaw);
  }, [rawYaw]);

  if (!view || !panorama || !unitView) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-blade-black" role="dialog" aria-modal="true" aria-label={`${panorama.label} — 360 degree view`}>
      <TiledPanorama
        key={`${view.zoneId}:${view.unitId}`}
        sceneId={panorama.sceneId}
        initialYaw={rawYaw}
        initialPitch={unitView.pitchDeg}
        fovDeg={unitView.fovDeg}
        panDeg={unitView.panDeg}
        panCenterDeg={rawPanCenter}
        pitchMinDeg={unitView.pitchMinDeg}
        pitchMaxDeg={unitView.pitchMaxDeg}
        onViewChange={setLiveRawYaw}
      />

      {/* Own inset overlay rather than folded into the top one below — that one is
          items-start (top content only); this is the one corner that anchors bottom. */}
      <div className="screen-inset pointer-events-none absolute inset-0 flex items-end justify-end">
        <PanoramaFloorRadar
          zoneId={view.zoneId}
          unitId={view.unitId}
          floorLabel={panorama.label}
          onSelectUnit={onChangeUnit}
          // Mirrored, not just offset: Marzipano's own yaw and this drawing's compass
          // bearing turn out to wind in OPPOSITE directions — confirmed by two headings
          // (true North showing South, then true East showing West once a plain +180
          // "fix" was tried), not derived on paper. A plain rawYaw+northDeg (or that plus
          // 180) only ever gets one axis right at a time; negating rawYaw first is what
          // gets both.
          viewBearingDeg={wrap360(180 - northDeg - liveRawYaw)}
        />
      </div>

      {/* pt- on top of this div's own screen-inset, same fix as Plans.jsx's plan panel:
          --chrome-top is a fixed clamp(), not remeasured off the rail, so it doesn't grow
          with the brand mark in TopRail's corner — without this the Close button (right,
          same corner as the mark) sits right under its tail instead of clear of it. */}
      <div className="screen-inset pointer-events-none absolute inset-0 flex items-start justify-between pt-[3.6em]">
        <div className="flex flex-col gap-[0.3em]">
          {/* text-shadow, same treatment as the map's bare labels (map.css) — this eyebrow
              and label sit directly on the panorama with no chip behind them, and a
              bright sky in the shot (see the 18th floor scene) washes flat cream out. */}
          <span className="eyebrow [text-shadow:0_1px_3px_rgb(5_4_3_/_0.9),0_0_8px_rgb(5_4_3_/_0.6)]">
            360° View
          </span>
          <span className="text-subhead font-medium uppercase text-blade-cream [text-shadow:0_1px_3px_rgb(5_4_3_/_0.9),0_0_8px_rgb(5_4_3_/_0.6)]">
            {panorama.label}
          </span>
        </div>
        {/* Same control as TopRail's MENU/HOME (EnterPortal size="sm") — one nav
            vocabulary rather than a one-off button just for this dialog. */}
        <EnterPortal
          size="sm"
          onClick={onClose}
          icon={<CloseIcon size="1.05em" />}
          aria-label="Close 360 degree view"
          className="pointer-events-auto mt-[2.6em]"
        >
          Close
        </EnterPortal>
      </div>
    </div>
  );
}
