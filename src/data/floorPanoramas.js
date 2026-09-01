// One Marzipano-tool scene per floor band, keyed by the tower zone that owns it (see
// towerZones.js). `sceneId` matches a scene's `id` in src/data/data.js, and its tiles
// live at public/assets/panoramas/tiles/<sceneId>/ — see TiledPanorama.jsx.
//
// (An earlier pass shipped these as flat equirectangular JPEGs — resized from the
// original 14400×7200 drone stills via scripts/resize-panoramas.mjs, since raw drone
// resolution exceeds what a WebGL texture can hold. Superseded now that a real tiled
// cubemap export exists; those resized JPEGs and that script are unused but left in
// place rather than deleted.)
//
// Only zones with an actual scene are listed here — a floor plate with no matching one
// (15th, 19th) has no panorama trigger rather than borrowing a neighbour's view.
//
// `northDeg` — the real compass bearing (this app's own plan-compass: bottom=North/0°,
// right=East/90°, top=South/180°, left=West/270° — see floorPlanRadar.js) that this
// scene's own RAW yaw 0° actually faces. Every drone capture started facing whatever
// direction it happened to, so this varies scene to scene and has to be found by eye:
// open the floor with no room override yet (or a temporary yawDeg: 0), note which real
// direction it's actually showing, and that's northDeg. Defaults to 0 (raw yaw 0 already
// IS north) when omitted — true for a scene nobody's found the true offset for yet.
// UnitPanoramaViewer subtracts this from every compass-space yawDeg/panCenterDeg in
// floorPlanRadarData.js before handing raw yaw to TiledPanorama, so the numbers in that
// file can stay honest, real-world compass degrees regardless of which way the drone
// happened to be facing when a given floor was shot.
export const FLOOR_PANORAMAS = {
  'f16-18': { sceneId: '9-floor-18', label: '18th Floor', northDeg: 180 },
  // Same story as f21-26 below: Office_1's raw yaw 0 was confirmed on-site as South, so
  // this scene is also 180° off true North.
  'f20': { sceneId: '8-floor-20', label: '20th Floor', northDeg: 180 },
  // Calibrated off Office_1's opening view (yawDeg 0, no override rotation yet): at raw
  // yaw 0 that scene was confirmed on-site to face South (180°), so this scene's own
  // "straight ahead" is 180° off true compass North — same offset as f16-18, coincidence
  // or not.
  'f21-26': { sceneId: '6-floor-25', label: '25th Floor', northDeg: 180 },
  'f27': { sceneId: '4-floor-27', label: '27th Floor', northDeg: 180 },
  'f29': { sceneId: '5-floor-29', label: '29th Floor', northDeg: 180 },
  'f30-33': { sceneId: '7-floor-32', label: '32nd Floor', northDeg: 180 },
  'f34': { sceneId: '3-floor-34', label: '34th Floor', northDeg: 180},
  'f35': { sceneId: '2-floor-35', label: '35th Floor',northDeg:180},
  'f36-40': { sceneId: '1-floor-40', label: '40th Floor',northDeg:180},
  crown: { sceneId: '0-floor-crown', label: 'The Crown' },
};

export const getFloorPanorama = (zoneId) => (zoneId ? (FLOOR_PANORAMAS[zoneId] ?? null) : null);
