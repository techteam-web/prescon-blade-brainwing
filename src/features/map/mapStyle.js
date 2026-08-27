// A MapLibre style: a real, legible night map of Mumbai, drawn in the brand's palette.
//
// The first version of this file kept only the coastline, the water and a whisper of the
// arterials, on the theory that page 6 of the vision document is a diagram and the map
// should be one too. On screen that read as a flat silhouette — no streets, no city, no
// sense of place — so this style now carries the whole hierarchy: landuse, the full road
// network with casings, railways, extruded buildings and a restrained set of place
// labels. The corridors, chips and markers from src/data/routes.js still draw over the
// top and are still the brightest thing on the map, which is what keeps it on-brand: the
// city is context, the corridors are the content.
//
// Tiles: MapTiler when VITE_MAPTILER_KEY is set, otherwise OpenFreeMap's free, keyless
// planet tiles. Both speak the OpenMapTiles schema, so every layer below is identical
// either way and the app works with no signup and no key in the repo.

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? '';

const TILES = MAPTILER_KEY
  ? `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`
  : 'https://tiles.openfreemap.org/planet';

const GLYPHS = MAPTILER_KEY
  ? `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${MAPTILER_KEY}`
  : 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

// Both providers serve the Noto stacks, so this is the one font name that resolves on
// either. A stack neither provider has means every label silently disappears.
const FONT = ['Noto Sans Regular'];
const FONT_BOLD = ['Noto Sans Bold'];

// Sampled off page 6, then extended down the same warm hue line for the layers page 6
// never had to draw.
export const MAP_COLORS = {
  sea: '#050403',
  land: '#141010',
  landFar: '#0D0A09',
  green: '#141a12',
  coast: '#2A211C',
  built: '#1a1412',
  industrial: '#171211',
  road: '#4a382a',
  roadMinor: '#2c221b',
  casing: '#0d0a09',
  rail: '#332821',
  building: '#241b16',
  buildingTall: '#3a2a20',
  label: '#a08d78',
  labelHalo: '#0b0807',
};

// Road widths are the one thing that has to scale smoothly across nine zoom levels, so
// every road layer is built from this rather than hand-tuned per class.
const width = (stops) => ['interpolate', ['exponential', 1.5], ['zoom'], ...stops.flat()];

const CLASS = (...values) => ['match', ['get', 'class'], values, true, false];

export const buildMapStyle = () => ({
  version: 8,
  name: 'Blade — Worli',
  glyphs: GLYPHS,
  sources: {
    omt: { type: 'vector', url: TILES },
  },
  // A low sun from the north-west, so the extruded blocks read as volumes rather than as
  // flat plates when the camera is pitched.
  // A low sun from the north-west. Intensity is deliberately near the floor: MapLibre's
  // extrusion lighting BRIGHTENS the faces it hits, and at the default 0.5 the whole
  // city came back several stops lighter than its base colour and read as a clay model
  // rather than as a place at night.
  light: { anchor: 'viewport', color: '#ffe7cf', intensity: 0.08, position: [1.4, 210, 42] },
  layers: [
    // Land is the ground: OpenMapTiles ships no landmass polygon, so the background IS
    // the land and water is painted over it. Getting this the wrong way round leaves an
    // entirely black map, because nothing ever paints the land.
    { id: 'land', type: 'background', paint: { 'background-color': MAP_COLORS.land } },

    /* ------------------------------------------------------------- ground cover */

    {
      id: 'landcover',
      type: 'fill',
      source: 'omt',
      'source-layer': 'landcover',
      filter: CLASS('wood', 'grass', 'scrub', 'farmland'),
      paint: { 'fill-color': MAP_COLORS.green, 'fill-opacity': 0.85 },
    },
    // Built-up land, so the city is not the same tone as open ground. This is most of
    // what makes the landmass read as a city at the wide zooms.
    {
      id: 'landuse-built',
      type: 'fill',
      source: 'omt',
      'source-layer': 'landuse',
      filter: CLASS('residential', 'commercial', 'retail', 'neighbourhood', 'suburb'),
      paint: { 'fill-color': MAP_COLORS.built, 'fill-opacity': 0.9 },
    },
    {
      id: 'landuse-industrial',
      type: 'fill',
      source: 'omt',
      'source-layer': 'landuse',
      filter: CLASS('industrial', 'railway', 'quarry'),
      paint: { 'fill-color': MAP_COLORS.industrial, 'fill-opacity': 0.9 },
    },
    // Parks and the race course read a shade greener, exactly as they do on page 6.
    {
      id: 'green',
      type: 'fill',
      source: 'omt',
      'source-layer': 'park',
      paint: { 'fill-color': MAP_COLORS.green, 'fill-opacity': 0.95 },
    },

    /* -------------------------------------------------------------------- water */

    {
      id: 'water',
      type: 'fill',
      source: 'omt',
      'source-layer': 'water',
      paint: { 'fill-color': MAP_COLORS.sea },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'omt',
      'source-layer': 'waterway',
      minzoom: 11,
      paint: {
        'line-color': MAP_COLORS.sea,
        'line-width': width([[11, 0.6], [16, 3]]),
        'line-opacity': 0.8,
      },
    },
    {
      id: 'coastline',
      type: 'line',
      source: 'omt',
      'source-layer': 'water',
      paint: {
        'line-color': MAP_COLORS.coast,
        'line-width': width([[8, 0.5], [14, 1.3]]),
        'line-opacity': 0.85,
      },
    },

    /* --------------------------------------------------------------------- roads
       Casings first, then fills — the standard two-pass road render. Without the dark
       casing every junction turns into a blob and the network stops reading as a
       network. Minzooms follow the OpenMapTiles schema: anything requested below the
       zoom the tile carries it at is simply an empty draw call. */

    {
      id: 'road-minor-casing',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 13,
      filter: CLASS('minor', 'service', 'track'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': MAP_COLORS.casing, 'line-width': width([[13, 1.4], [18, 9]]) },
    },
    {
      id: 'road-secondary-casing',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 10,
      filter: CLASS('secondary', 'tertiary'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': MAP_COLORS.casing, 'line-width': width([[10, 1.6], [18, 14]]) },
    },
    {
      id: 'road-major-casing',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      filter: CLASS('motorway', 'trunk', 'primary'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': MAP_COLORS.casing, 'line-width': width([[8, 1.8], [12, 4.4], [18, 22]]) },
    },

    {
      id: 'road-minor',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 13,
      filter: CLASS('minor', 'service', 'track'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': MAP_COLORS.roadMinor,
        'line-width': width([[13, 0.5], [18, 6]]),
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.45, 15, 1],
      },
    },
    {
      id: 'road-tertiary',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 10,
      filter: CLASS('tertiary'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#372a20',
        'line-width': width([[10, 0.5], [14, 1.9], [18, 9]]),
        'line-opacity': 0.9,
      },
    },
    {
      id: 'road-secondary',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 9,
      filter: CLASS('secondary'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#3f3025',
        'line-width': width([[9, 0.6], [14, 2.4], [18, 11]]),
        'line-opacity': 0.95,
      },
    },
    {
      id: 'road-primary',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      filter: CLASS('primary', 'trunk'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': MAP_COLORS.road,
        'line-width': width([[8, 0.8], [12, 2.2], [18, 15]]),
      },
    },
    // The motorways are the brightest thing the basemap draws — one step below the
    // corridors, which is exactly the hierarchy page 6 asks for.
    {
      id: 'road-motorway',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      filter: CLASS('motorway'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#5e4732',
        'line-width': width([[7, 0.9], [12, 2.8], [18, 18]]),
      },
    },
    {
      id: 'rail',
      type: 'line',
      source: 'omt',
      'source-layer': 'transportation',
      minzoom: 10,
      filter: CLASS('rail', 'transit'),
      paint: {
        'line-color': MAP_COLORS.rail,
        'line-width': width([[10, 0.5], [16, 2.2]]),
        'line-dasharray': [3, 2],
        'line-opacity': 0.8,
      },
    },

    /* ---------------------------------------------------------------- buildings
       Flat footprints as soon as the tiles carry them, then real extrusions from 14.
       The camera sits at 48° of pitch, so the extrusions are most of what turns this
       from a plan into a place. */

    {
      id: 'building-flat',
      type: 'fill',
      source: 'omt',
      'source-layer': 'building',
      minzoom: 12.5,
      maxzoom: 14,
      paint: {
        'fill-color': MAP_COLORS.building,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12.5, 0, 13.5, 0.9],
      },
    },
    {
      id: 'building-3d',
      type: 'fill-extrusion',
      source: 'omt',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        // Taller blocks catch more of the light, so the towers separate from the low-rise
        // instead of the whole city arriving as one grey mass.
        'fill-extrusion-color': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'render_height'], 8],
          0, '#1d1613',
          40, '#251c17',
          120, MAP_COLORS.building,
          260, MAP_COLORS.buildingTall,
        ],
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'],
          14, 0,
          15.5, ['coalesce', ['get', 'render_height'], 8],
        ],
        'fill-extrusion-base': [
          'interpolate', ['linear'], ['zoom'],
          14, 0,
          15.5, ['coalesce', ['get', 'render_min_height'], 0],
        ],
        'fill-extrusion-opacity': 0.92,
      },
    },

    /* ------------------------------------------------------------------- labels
       Restrained on purpose: settlements, the sea, and named roads — nothing else. POIs
       would compete with the landmark chips, which are the labels that matter here. Road
       names only draw in from zoom 14, close enough in that they read as street context
       rather than clutter over the wide city view. */

    {
      id: 'label-road',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'transportation_name',
      minzoom: 14,
      filter: CLASS('motorway', 'trunk', 'primary', 'secondary', 'tertiary'),
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 14, 9.5, 18, 13],
        'text-letter-spacing': 0.04,
      },
      paint: {
        'text-color': MAP_COLORS.label,
        'text-halo-color': MAP_COLORS.labelHalo,
        'text-halo-width': 1.2,
        'text-opacity': 0.85,
      },
    },
    {
      id: 'label-water',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'water_name',
      minzoom: 9,
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 14, 13],
        'text-letter-spacing': 0.24,
        'text-transform': 'uppercase',
        'text-max-width': 7,
      },
      paint: {
        'text-color': '#5d5347',
        'text-halo-color': MAP_COLORS.sea,
        'text-halo-width': 1,
      },
    },
    {
      id: 'label-place',
      type: 'symbol',
      source: 'omt',
      'source-layer': 'place',
      filter: CLASS('city', 'town', 'suburb', 'neighbourhood'),
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        // 'literal' is not optional: a bare array in an expression slot is parsed as an
        // expression, and ["Noto Sans Bold"] is not one.
        'text-font': ['match', ['get', 'class'], ['city', 'town'], ['literal', FONT_BOLD], ['literal', FONT]],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          9, ['match', ['get', 'class'], ['city'], 12, ['town'], 10, 8.5],
          15, ['match', ['get', 'class'], ['city'], 17, ['town'], 14, 12],
        ],
        'text-letter-spacing': 0.16,
        'text-transform': 'uppercase',
        'text-max-width': 8,
        'text-padding': 6,
      },
      paint: {
        'text-color': MAP_COLORS.label,
        'text-halo-color': MAP_COLORS.labelHalo,
        'text-halo-width': 1.2,
        'text-opacity': ['match', ['get', 'class'], ['city', 'town'], 0.9, 0.62],
      },
    },
  ],
});
