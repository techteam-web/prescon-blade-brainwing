// A MapLibre style built to match page 6 of the vision document.
//
// That page is a black sea, a near-black warm landmass, and coloured corridors drawn
// over the top. Nothing else. So this style throws away almost everything a general
// basemap ships with — no POIs, no road network, no building fills, no place labels of
// its own — and keeps only the coastline, the water, and the barest sense of the green
// spaces. The corridors, chips and labels are added over it from src/data/routes.js.
//
// Tiles: MapTiler when VITE_MAPTILER_KEY is set, otherwise OpenFreeMap's free, keyless
// planet tiles. Both speak the OpenMapTiles schema, so the layers below are identical
// either way and the app works with no signup and no key in the repo.

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? '';

const TILES = MAPTILER_KEY
  ? `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`
  : 'https://tiles.openfreemap.org/planet';

const GLYPHS = MAPTILER_KEY
  ? `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${MAPTILER_KEY}`
  : 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

// Sampled off page 6.
export const MAP_COLORS = {
  sea: '#050403',
  land: '#141010',
  landFar: '#0D0A09',
  green: '#17150F',
  coast: '#2A211C',
};

export const buildMapStyle = () => ({
  version: 8,
  name: 'Blade — Worli',
  glyphs: GLYPHS,
  sources: {
    omt: { type: 'vector', url: TILES },
  },
  layers: [
    // Land is the ground: OpenMapTiles ships no landmass polygon, so the background IS
    // the land and water is painted over it. Getting this the wrong way round leaves an
    // entirely black map, because nothing ever paints the land.
    { id: 'land', type: 'background', paint: { 'background-color': MAP_COLORS.land } },

    // Parks and the race course read a shade greener, exactly as they do on page 6.
    {
      id: 'green',
      type: 'fill',
      source: 'omt',
      'source-layer': 'park',
      paint: { 'fill-color': MAP_COLORS.green, 'fill-opacity': 0.9 },
    },

    // A whisper of the arterial network, so the landmass is not a flat silhouette. Kept
    // far below the corridor colours — on page 6 you sense the city, you do not read it.
    {
      id: 'arterials',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false],
      paint: {
        'line-color': '#2A211C',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.4, 14, 1.2],
        'line-opacity': 0.6,
      },
    },

    // Water last, so the coastline is a crisp cut out of the land.
    {
      id: 'water',
      type: 'fill',
      source: 'omt',
      'source-layer': 'water',
      paint: { 'fill-color': MAP_COLORS.sea },
    },
    {
      id: 'coastline',
      type: 'line',
      source: 'omt',
      'source-layer': 'water',
      paint: {
        'line-color': MAP_COLORS.coast,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 1.3],
        'line-opacity': 0.85,
      },
    },
  ],
});
