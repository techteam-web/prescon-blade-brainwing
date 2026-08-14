// Road-following directions from the public OSRM demo server. Free, keyless, and the
// same service the Zenith and Haiko maps use.

import { PROJECT } from '../../data/landmarks';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Fetch a real road route from the tower to a destination.
 * Returns { coordinates, distance (m), duration (s) }.
 */
export async function fetchRoute(dest, signal) {
  const url =
    `${OSRM}/${PROJECT.lng},${PROJECT.lat};${dest[0]},${dest[1]}` +
    `?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error('no route');
  const r = json.routes[0];
  return { coordinates: r.geometry.coordinates, distance: r.distance, duration: r.duration };
}

// The four ways someone actually arrives here.
//
// OSRM's public demo server only carries the driving profile — asking it for foot or
// bike returns the driving answer, so quoting those as if they were routed would be
// making numbers up. Car time is OSRM's own. The other three are derived from the real
// road distance at published Mumbai averages, and the UI labels them as estimates.
//
//   Metro  Line 3 (Aqua) averages ~34 km/h including dwell time
//   Bus    BEST averages ~14 km/h across the island city
//   Walk   4.8 km/h, the standard planning figure
const MODES = [
  { id: 'car', label: 'Car', kmh: null },
  { id: 'metro', label: 'Metro', kmh: 34 },
  { id: 'bus', label: 'Bus', kmh: 14 },
  { id: 'walk', label: 'Walk', kmh: 4.8 },
];

const fmtDuration = (seconds) => {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
};

export const formatDistance = (metres) =>
  metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;

/** Travel times for every mode, given a routed distance and the car's own duration. */
export function travelTimes({ distance, duration }) {
  return MODES.map((m) => ({
    id: m.id,
    label: m.label,
    estimated: m.kmh !== null,
    time: fmtDuration(m.kmh === null ? duration : (distance / 1000 / m.kmh) * 3600),
  }));
}
