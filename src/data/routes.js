// The connectivity routes drawn over the map, and the legend that explains them.
//
// Colours and line treatments are taken directly off page 6 of the vision document —
// that page's legend is the client's own visual language for these corridors, and this
// screen has to read as the same drawing.
//
// This file is now only the LOOK of the corridors. Their geometry moved to
// src/data/corridors.js, which is generated from OSRM and OpenStreetMap — see
// scripts/build-corridors.mjs for why it is no longer hand-authored.

export const ROUTE_STYLES = {
  coastal: { color: '#C89B6E', width: 3, dash: [2.5, 1.6], casing: '#8A6440', label: 'Coastal Road' },
  railway: { color: '#8492EE', width: 2.8, dash: [1.4, 1.2], casing: null, label: 'Western Railway' },
  aqua: { color: '#22E3DC', width: 3, dash: null, casing: null, label: 'The Aqua Line' },
  eeh: { color: '#C3B0E6', width: 2.8, dash: [3, 1.4], casing: null, label: 'Eastern Express Highway' },
  freeway: { color: '#A182E0', width: 2.8, dash: [3, 1.4], casing: null, label: 'Eastern Freeway' },
  mthl: { color: '#C08A5C', width: 3.4, dash: null, casing: '#6E4A2E', label: 'MTHL' },
  vashi: { color: '#C08A5C', width: 3.4, dash: [3, 1.6], casing: '#6E4A2E', label: 'Vashi Bridge' },
};

// Legend order matches page 6, left to right.
export const LEGEND = ['coastal', 'railway', 'aqua', 'eeh', 'freeway', 'mthl', 'vashi'];

// The geometry itself lives in src/data/corridors.js and is GENERATED — see
// scripts/build-corridors.mjs. It used to be hand-typed vertices here, which floated a
// few hundred metres off the roads they named once the basemap grew a real road network.

// The distance chips from page 6. `at` is where the chip sits on the map; `km` is the
// verified road distance from the project, matching the connectivity list.
export const DISTANCE_CHIPS = [
  { id: 'coastal', km: 1.2, at: [72.8071, 18.9812] },
  { id: 'racecourse', km: 1.8, at: [18.984313222742394, 72.81996502153488] },
  { id: 'sealink', km: 1.5, at: [72.8236, 19.0332] },
  { id: 'lowerparel', km: 1.2, at: [72.8352, 18.9902] },
  { id: 'aqua', km: 4.4, at: [72.8262, 18.9588] },
  { id: 'bkc', km: 4.4, at: [72.8688, 19.0602] },
  { id: 'railway', km: 7.0, at: [72.8452, 19.0288] },
  { id: 'nariman', km: 10.7, at: [72.8188, 18.9212] },
  { id: 'churchgate', km: 10.8, at: [72.8298, 18.9308] },
  { id: 'airport', km: 12.4, at: [72.8752, 19.0982] },
  { id: 'andheri', km: 14.5, at: [72.8586, 19.1218] },
  { id: 'freeway', km: 24.4, at: [72.8968, 19.0452] },
  { id: 'vashi', km: 26.1, at: [72.9948, 19.0812] },
  { id: 'mthl', km: 35.1, at: [72.9622, 18.9578] },
  { id: 'navi', km: 37.6, at: [73.0642, 18.9312] },
];

// Place labels, as on page 6.
export const PLACE_LABELS = [
  { id: 'sealink', name: 'Bandra Worli Sea Link', at: [72.8214, 19.0287] },
  { id: 'racecourse', name: 'Mahalaxmi Race Course', at: [18.984313222742394, 72.81996502153488] },
  { id: 'lowerparel', name: 'Lower Parel', at: [72.8302, 18.9958] },
  { id: 'dadar', name: 'Dadar', at: [72.8402, 19.0178] },
  { id: 'bkc', name: 'BKC', at: [72.8618, 19.0654] },
  { id: 'airport', name: 'Chhatrapati Shivaji Maharaj Intl. Airport', at: [72.8682, 19.0902] },
  { id: 'andheri', name: 'Andheri', at: [72.8546, 19.1136] },
  { id: 'nariman', name: 'Nariman Point', at: [72.8232, 18.9256] },
  { id: 'churchgate', name: 'Churchgate', at: [72.8272, 18.9322] },
  { id: 'fort', name: 'Fort', at: [72.8352, 18.9338] },
  { id: 'cuffe', name: 'Cuffe Parade', at: [72.8188, 18.9142] },
  { id: 'vashi', name: 'Vashi', at: [73.0028, 19.0768] },
  { id: 'navi', name: 'Navi Mumbai Intl. Airport', at: [73.0642, 18.9312] },
];
