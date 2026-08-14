// The connectivity routes drawn over the map, and the legend that explains them.
//
// Colours and line treatments are taken directly off page 6 of the vision document —
// that page's legend is the client's own visual language for these corridors, and this
// screen has to read as the same drawing.
//
// The polylines are SIMPLIFIED ALIGNMENTS: real endpoints and real intermediate
// waypoints, smoothed to a handful of vertices each. They are an accurate diagram of
// where each corridor runs, not a survey. That is exactly what page 6 is, and it is why
// both carry the mandatory "Map not to scale" caption.

export const ROUTE_STYLES = {
  coastal: { color: '#C89B6E', width: 3, dash: [2.5, 1.6], casing: '#8A6440', label: 'Coastal Road' },
  railway: { color: '#5B6BD6', width: 3, dash: [0.6, 1.4], casing: null, label: 'Western Railway' },
  aqua: { color: '#22E3DC', width: 3, dash: null, casing: null, label: 'The Aqua Line' },
  eeh: { color: '#B39DDB', width: 2.6, dash: [3, 1.4], casing: null, label: 'Eastern Express Highway' },
  freeway: { color: '#8E6FD0', width: 2.6, dash: [3, 1.4], casing: null, label: 'Eastern Freeway' },
  mthl: { color: '#B07A50', width: 3.4, dash: null, casing: '#6E4A2E', label: 'MTHL' },
  vashi: { color: '#B07A50', width: 3.4, dash: [3, 1.6], casing: '#6E4A2E', label: 'Vashi Bridge' },
};

// Legend order matches page 6, left to right.
export const LEGEND = ['coastal', 'railway', 'aqua', 'eeh', 'freeway', 'mthl', 'vashi'];

const line = (id, coordinates) => ({
  type: 'Feature',
  properties: { id },
  geometry: { type: 'LineString', coordinates },
});

// [lng, lat]
export const ROUTES = {
  type: 'FeatureCollection',
  features: [
    // Coastal Road — Marine Drive up the western seafront through Worli to the Sea Link.
    line('coastal', [
      [72.8232, 18.9256], [72.8189, 18.9435], [72.8156, 18.9612], [72.8134, 18.9788],
      [72.8118, 18.9905], [72.8106, 19.0002], [72.8121, 19.0108], [72.8168, 19.0201],
      [72.8214, 19.0287],
    ]),
    // Western Railway — Churchgate to Andheri.
    line('railway', [
      [72.8272, 18.9322], [72.8248, 18.9498], [72.8232, 18.9648], [72.8262, 18.9812],
      [72.8318, 18.9955], [72.8402, 19.0148], [72.8452, 19.0402], [72.8478, 19.0668],
      [72.8512, 19.0912], [72.8546, 19.1136],
    ]),
    // Metro Line 3 (Aqua Line) — Cuffe Parade to SEEPZ, via Acharya Atre Chowk.
    line('aqua', [
      [72.8188, 18.9142], [72.8244, 18.9308], [72.8262, 18.9498], [72.8232, 18.9702],
      [72.8182, 18.9968], [72.8258, 19.0128], [72.8402, 19.0332], [72.8542, 19.0602],
      [72.8664, 19.0908], [72.8768, 19.1178],
    ]),
    // Eastern Express Highway — Sion northward through Thane.
    line('eeh', [
      [72.8618, 19.0388], [72.8802, 19.0568], [72.8968, 19.0812], [72.9126, 19.1132],
      [72.9328, 19.1488], [72.9564, 19.1852], [72.9742, 19.2168],
    ]),
    // Eastern Freeway — Orange Gate to Ghatkopar via the Anik-Panjarpol link.
    line('freeway', [
      [72.8402, 18.9498], [72.8508, 18.9678], [72.8612, 18.9868], [72.8752, 19.0098],
      [72.8886, 19.0338], [72.9028, 19.0588], [72.9142, 19.0812],
    ]),
    // MTHL / Atal Setu — Sewri to Chirle across the harbour.
    line('mthl', [
      [72.8582, 18.9982], [72.8862, 18.9868], [72.9182, 18.9738], [72.9528, 18.9612],
      [72.9848, 18.9528], [73.0142, 18.9482],
    ]),
    // Vashi Bridge — Mankhurd across Thane creek into Navi Mumbai.
    line('vashi', [
      [72.9302, 19.0538], [72.9498, 19.0602], [72.9686, 19.0688], [72.9862, 19.0752],
      [73.0028, 19.0768],
    ]),
  ],
};

// The distance chips from page 6. `at` is where the chip sits on the map; `km` is the
// verified road distance from the project, matching the connectivity list.
export const DISTANCE_CHIPS = [
  { id: 'coastal', km: 1.2, at: [72.8071, 18.9812] },
  { id: 'racecourse', km: 1.8, at: [72.8168, 18.9758] },
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
  { id: 'racecourse', name: 'Mahalaxmi Race Course', at: [72.8200, 18.9842] },
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
