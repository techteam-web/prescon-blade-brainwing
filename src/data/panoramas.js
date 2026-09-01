// The 360° view, taken at three times of day from the client's drone-shoot schedule.
//
// `sceneId` matches a scene's `id` in src/data/data.js (the Marzipano-tool export), and
// its tiles live at public/assets/panoramas/tiles/<sceneId>/ — same tiled-cubemap setup
// the floor picker's unit views use (see floorPanoramas.js, TiledPanorama.jsx). Until the
// drone shoot is delivered every sceneId is null, and the viewer shows the time-of-day
// selector with an empty stage rather than substituting a render — a flat render is not a
// 360° view and must never be presented as one.
//
export const PANORAMAS = [
  { id: 'day', label: 'Day View', sceneId: '2-dji_0010_180m' },
  { id: 'evening', label: 'Evening View', sceneId: '1-dji_0158_180m' },
  { id: 'twilight', label: 'Twilight View', sceneId: '0-dji_0002_180m' },
];

export const PANORAMA_BY_ID = Object.fromEntries(PANORAMAS.map((p) => [p.id, p]));

export const hasPanoramas = PANORAMAS.some((p) => p.sceneId);
