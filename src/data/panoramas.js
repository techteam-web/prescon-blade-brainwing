// The 360° view, taken at three times of day from the client's drone-shoot schedule.
//
// `src` is an equirectangular (2:1) JPEG in public/assets/panoramas/. Until the drone
// shoot is delivered every src is null, and the viewer shows the time-of-day selector
// with an empty stage rather than substituting a render — a flat render is not a 360°
// view and must never be presented as one.
//
// TODO: client content — equirectangular panoramas from the drone shoot.

export const PANORAMAS = [
  { id: 'day', label: 'Day View', src: null },
  { id: 'evening', label: 'Evening View', src: null },
  { id: 'night', label: 'Night View', src: null },
];

export const PANORAMA_BY_ID = Object.fromEntries(PANORAMAS.map((p) => [p.id, p]));

export const hasPanoramas = PANORAMAS.some((p) => p.src);
