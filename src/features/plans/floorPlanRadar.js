// Compass math for the panorama "radar" aiming tool (PanoRadarTuner, ?radar=1 only) and
// for the frozen baseline every panorama opens at, tuner or not.
//
// The floor plan's own compass is fixed and unusual — north sits at the BOTTOM of every
// plate, not the top (see the click handler in FloorPlanOverlay.jsx): bottom = North/0°,
// right = East/90°, top = South/180°, left = West/270°, with NE/SE/SW/NW at the 45° marks
// between. Every heading in this module lives in that same frame, in degrees, wrapped to
// [0, 360).

export const COMPASS_STEP = 45;

export const wrap360 = (deg) => ((deg % 360) + 360) % 360;

// The automatic baseline (wherever a click landed) freezes to the nearest 8-point
// compass mark — a click a few degrees off due north still means "aim north", not "aim
// 3.7° east of north". PanoRadarTuner's manual nudges move a room off this grid on
// purpose, for the handful where the frozen 8 points aren't quite true.
export const snapToCompass = (deg) => wrap360(Math.round(wrap360(deg) / COMPASS_STEP) * COMPASS_STEP);

// Plain averaging breaks across the 0°/360° seam (350° and 10° should average to 0°, not
// 180°) — go through unit vectors instead.
export function circularMean(degrees) {
  if (!degrees.length) return null;
  let x = 0;
  let y = 0;
  for (const d of degrees) {
    const r = (d * Math.PI) / 180;
    x += Math.sin(r);
    y += Math.cos(r);
  }
  return wrap360((Math.atan2(x, y) * 180) / Math.PI);
}

// A room entry's own opening heading, whichever shape it's stored in — plain number, or
// the full { yawDeg, ... } view.
export const yawOf = (entry) => (typeof entry === 'number' ? entry : entry?.yawDeg);

// What the individually-dialled-in rooms on one floor work out to, on their own — the
// "auto" line in the tuner. `roomOverrides` is { [regionName]: entry } for that floor.
export function deriveFloorFacing(roomOverrides) {
  const rooms = roomOverrides ?? {};
  const entries = Object.entries(rooms);
  if (!entries.length) return null;
  const floor = circularMean(entries.map(([, entry]) => yawOf(entry)));
  return { floor: Math.round(floor), count: entries.length, rooms };
}

// An override entry is either a plain degree number — shorthand for { yawDeg: <that>,
// panDeg: 0 }, i.e. open facing that direction and stay fully fixed there, because
// there's nothing else on the floor for this unit to look toward — or the full
// { yawDeg, pitchDeg, fovDeg, panDeg } shape, matching what Panorama.jsx takes directly:
//   yawDeg    — opening compass heading (this module's frame: bottom=0°/N, right=90°/E…)
//   pitchDeg  — opening vertical tilt, degrees, default 0
//   fovDeg    — field of view in degrees, default Panorama's own built-in framing
//   panDeg    — width of the window `yawDeg` sits centred in, that dragging can pan
//               across without leaving; 0 = fixed (default), omitted/≥360 = unrestricted
const normalizeEntry = (entry) => (typeof entry === 'number' ? { yawDeg: entry, panDeg: 0 } : entry);

// Precedence: an explicit room dial-in wins outright; otherwise a floor dial-in;
// otherwise a building-wide dial-in; otherwise the frozen click baseline. `overrides`
// has the shape of RADAR_OVERRIDES in floorPlanRadarData.js (building/floor/room).
function matchOverride({ buildingId, floorLabel, regionName, overrides }) {
  const room = regionName != null ? overrides.room?.[buildingId]?.[floorLabel]?.[regionName] : undefined;
  if (room !== undefined) return normalizeEntry(room);
  const floor = overrides.floor?.[buildingId]?.[floorLabel];
  if (floor !== undefined) return normalizeEntry(floor);
  const building = overrides.building?.[buildingId];
  if (building !== undefined) return normalizeEntry(building);
  return null;
}

// A plain degree number for the tuner's simpler "facing" readout (PanoRadarTuner shows
// one number, not the full view shape).
export function resolveFacing({ buildingId, floorLabel, regionName, baselineDeg, overrides }) {
  const matched = matchOverride({ buildingId, floorLabel, regionName, overrides });
  if (matched) return wrap360(matched.yawDeg);
  return snapToCompass(baselineDeg);
}

// An unconfigured unit still gets to look left and right from wherever the click aimed
// it — like turning your head at a window — it just never swings round far enough to
// see whatever's behind that window (the corridor, a neighbouring unit's own vista).
// Narrower than a full half-turn on purpose: 180° already reaches the room's own side
// flanks, which starts to read as "spun around" rather than "looked out the window".
const DEFAULT_PAN_DEG = 150;

// A unit's opening framing without its own fovDeg override otherwise fell back to
// TiledPanorama's scene default (~72°, the same walked-in capture fov every scene
// ships with) — noticeably "zoomed in" for a unit view's first impression. Pinned to
// TiledPanorama's own vfov limiter ceiling (90°) so a unit opens as fully zoomed OUT
// as the viewer allows, not partway there.
const DEFAULT_UNIT_FOV_DEG = 90;

// A window can also be dialled in as swing off the opening yawDeg — panLeftDeg/
// panRightDeg, e.g. "2° left, 90° right of due-North" — rather than pre-computed into a
// width and an off-centre centre by hand. Both shapes resolve to the same panDeg/
// panCenterDeg pair Panorama.jsx actually takes; a side left unset defaults to 0 (no
// swing that way, same as an unconfigured plain-number entry defaults to none at all).
// Takes precedence over panDeg/panCenterDeg when either is present, rather than mixing
// the two shapes on one entry.
function resolvePanWindow(matched, yawDeg) {
  if (matched?.panLeftDeg == null && matched?.panRightDeg == null) {
    return { panDeg: matched?.panDeg ?? DEFAULT_PAN_DEG, panCenterDeg: matched?.panCenterDeg ?? null };
  }
  const left = matched.panLeftDeg ?? 0;
  const right = matched.panRightDeg ?? 0;
  return { panDeg: left + right, panCenterDeg: yawDeg + (right - left) / 2 };
}

// Vertical counterpart to panLeftDeg/panRightDeg: panUpDeg/panDownDeg swing off the
// opening pitchDeg rather than the fixed -90..90 full tilt range. Unset on either side
// falls back to the full range on that side, same as an unconfigured yaw window has
// nothing to restrict it — most rooms have no vertical override at all.
function resolvePitchWindow(matched, pitchDeg) {
  const up = matched?.panUpDeg;
  const down = matched?.panDownDeg;
  return {
    pitchMinDeg: down == null ? -90 : Math.max(-90, pitchDeg - down),
    pitchMaxDeg: up == null ? 90 : Math.min(90, pitchDeg + up),
  };
}

// The full view Panorama.jsx actually renders with — everything resolveFacing collapses
// down to one number, plus pitch/fov/pan. No override at all still freezes the CENTRE of
// that look-around window to the click baseline, rather than a free-look tour with no
// anchor at all.
export function resolveUnitView({ buildingId, floorLabel, regionName, baselineDeg, overrides }) {
  const matched = matchOverride({ buildingId, floorLabel, regionName, overrides });
  // Per-field fallback, not "matched ? matched.yawDeg : …" — an override entry that only
  // sets panDeg (the common case: keep the click's own heading, just tune how wide it can
  // swing) must still resolve to a real heading here rather than to undefined.
  const yawDeg = wrap360(matched?.yawDeg ?? snapToCompass(baselineDeg));
  const { panDeg, panCenterDeg } = resolvePanWindow(matched, yawDeg);
  const pitchDeg = matched?.pitchDeg ?? 0;
  const { pitchMinDeg, pitchMaxDeg } = resolvePitchWindow(matched, pitchDeg);
  return {
    yawDeg,
    pitchDeg,
    fovDeg: matched?.fovDeg ?? DEFAULT_UNIT_FOV_DEG,
    panDeg,
    // null tells Panorama.jsx to centre the pan window on yawDeg itself — the common
    // case. Only set when the opening view sits off-centre in its own window.
    panCenterDeg: panCenterDeg != null ? wrap360(panCenterDeg) : null,
    pitchMinDeg,
    pitchMaxDeg,
  };
}
