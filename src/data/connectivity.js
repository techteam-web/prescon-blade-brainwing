// The connectivity list from the brochure, with a real coordinate on every row.
//
// `at` is [lng, lat] for the actual place, so selecting a row can fly the map there and
// draw a line to it. Coordinates are the Google Maps pin for each destination; `km` is
// the brochure's own road distance and is left exactly as published.
//
// `cat` groups a row under one of the four filters. `node` rows are context and are
// always shown.

export const CONNECTIVITY = [
  { id: 'coastal', label: 'Coastal Road', km: 1.2, cat: 'node', at: [72.8106, 19.0002] },
  { id: 'lowerparel', label: 'Lower Parel', km: 1.2, cat: 'enterprise', at: [72.8302, 18.9958] },
  { id: 'sealink', label: 'Bandra–Worli Sea Link', km: 1.5, cat: 'node', at: [72.8203, 19.0281] },
  { id: 'racecourse', label: 'Mahalaxmi Race Course', km: 1.8, cat: 'hospitality', at: [72.8200, 18.9842] },
  { id: 'bkc', label: 'BKC', km: 4.4, cat: 'enterprise', at: [72.8656, 19.0662] },
  { id: 'aqua', label: 'The Aqua Line', km: 4.4, cat: 'node', at: [72.8181, 18.9971] },
  { id: 'railway', label: 'Western Railway', km: 7.0, cat: 'node', at: [72.8403, 19.0176] },
  { id: 'nariman', label: 'Nariman Point', km: 10.7, cat: 'enterprise', at: [72.8227, 18.9256] },
  { id: 'churchgate', label: 'Churchgate', km: 10.8, cat: 'node', at: [72.8267, 18.9322] },
  { id: 'airport', label: 'CSMI Airport (T2)', km: 12.4, cat: 'node', at: [72.8682, 19.0902] },
  { id: 'andheri', label: 'Andheri', km: 14.5, cat: 'commerce', at: [72.8465, 19.1197] },
  { id: 'freeway', label: 'Eastern Freeway', km: 24.4, cat: 'node', at: [72.8886, 19.0338] },
  { id: 'vashi', label: 'Vashi Bridge', km: 26.1, cat: 'node', at: [73.0028, 19.0768] },
  { id: 'mthl', label: 'MTHL (Atal Setu)', km: 35.1, cat: 'node', at: [72.9528, 18.9612] },
  { id: 'navi', label: 'Navi Mumbai Intl Airport', km: 37.6, cat: 'node', at: [73.0659, 18.9321] },
];

export const CONNECTIVITY_BY_ID = Object.fromEntries(CONNECTIVITY.map((c) => [c.id, c]));
