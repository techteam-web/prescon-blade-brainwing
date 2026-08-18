// Builds src/data/corridors.js — the connectivity corridors drawn over the Location map.
//
// WHY THIS EXISTS. The corridors used to be hand-typed polylines: eight or nine vertices
// each, eyeballed off page 6 of the vision document. That was defensible while the
// basemap was a bare silhouette, because there was nothing underneath to disagree with.
// The moment the basemap grew a real road network, the approximations were obvious —
// MTHL ran out into open water eleven kilometres north of where it actually lands, and
// every other corridor floated a few hundred metres off the road it was naming.
//
// So none of this geometry is authored any more. Road corridors are routed by OSRM, the
// same service the directions panel uses, so they follow the real carriageway. Rail and
// metro corridors come from their OpenStreetMap route relations, which are the same data
// the basemap is rendered from — so they land exactly on the rail the map already draws.
//
// Run: npm run assets:corridors
// The output is committed. This script is never part of the app build, and the app has
// no runtime dependency on either service.

import { writeFile } from 'node:fs/promises';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const UA = 'prescon-blade-corridor-builder/1.0 (build script)';

// Overpass mirrors, tried in order. The public instances 504 under load often enough
// that a single endpoint makes this script a coin flip.
const OVERPASS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.osm.jp/api/interpreter',
];

/* ------------------------------------------------------------------ corridors */

// Endpoints and vias are real places. A via is only present where OSRM would otherwise
// take a faster inland road and miss the corridor being named — the Coastal Road is the
// only one that needs the hint, because Annie Besant Road parallels it and is quicker.
const ROADS = [
  {
    id: 'coastal',
    label: 'Coastal Road',
    // Marine Drive → the Worli Coastal Road → the Bandra end of the Sea Link.
    points: [[72.8235, 18.9256], [72.8207, 18.9585], [72.8112, 18.9938], [72.8177, 19.0475]],
  },
  {
    id: 'eeh',
    label: 'Eastern Express Highway',
    points: [[72.8636, 19.04], [72.9285, 19.108], [72.969, 19.189]],
  },
  {
    id: 'freeway',
    label: 'Eastern Freeway',
    points: [[72.8437, 18.9556], [72.8712, 19.0198], [72.901, 19.068]],
  },
  {
    id: 'vashi',
    label: 'Vashi Bridge',
    points: [[72.9292, 19.0533], [73.0085, 19.0762]],
  },
];

// Corridors taken straight from OSM ways rather than routed.
//
// MTHL has to be here. The public OSRM demo runs on a planet snapshot that predates the
// Atal Setu opening, so asking it to drive from Sewri to Chirle returns a 42 km detour
// around the head of the creek through Vashi — which is precisely the "line pointing
// into the sea and then off somewhere else" this whole rewrite is fixing. The bridge is
// in OpenStreetMap, so take it from there.
const WAYS = [
  {
    id: 'mthl',
    label: 'MTHL (Atal Setu)',
    query:
      '[out:json][timeout:120];way["name"~"^Atal Setu$"](18.75,72.80,19.10,73.15);out geom;',
    // A dual carriageway is two parallel one-way ways, and the stitcher happily chains
    // the northbound onto the end of the southbound — which is how a 21.8 km bridge came
    // back as a 42 km line that ran to Chirle and then straight back to Sewri.
    oneCarriageway: true,
  },
];

// OSM route relations. `clip` trims the full line to the stretch this deck talks about —
// the Western Line runs to Virar, which is 60 km off the top of a map centred on Worli.
const RAILS = [
  {
    id: 'aqua',
    label: 'The Aqua Line',
    relation: 17876723, // Line 3 (Cuffe Parade → Aarey JVLR)
  },
  {
    id: 'railway',
    label: 'Western Railway',
    relation: 11511060, // Western Line (slow): Churchgate => Virar
    clip: [[72.8272, 18.9322], [72.8465, 19.1197]], // Churchgate → Andheri
  },
];

/* -------------------------------------------------------------------- helpers */

const rad = (d) => (d * Math.PI) / 180;

// Metres between two [lng, lat] pairs. Equirectangular is ample at this scale and keeps
// the script dependency-free.
function metres(a, b) {
  const x = rad(b[0] - a[0]) * Math.cos(rad((a[1] + b[1]) / 2));
  const y = rad(b[1] - a[1]);
  return Math.sqrt(x * x + y * y) * 6371008.8;
}

const lengthOf = (line) => line.reduce((sum, p, i) => (i ? sum + metres(line[i - 1], p) : 0), 0);

// Ramer–Douglas–Peucker. The routed geometries come back with thousands of vertices; at
// the zooms this map is ever seen at, a 12 m tolerance is invisible and cuts the payload
// by about 95%.
function simplify(points, tolerance) {
  if (points.length < 3) return points;

  const perpendicular = (p, a, b) => {
    const x = rad(b[0] - a[0]) * Math.cos(rad(a[1])) * 6371008.8;
    const y = rad(b[1] - a[1]) * 6371008.8;
    const len2 = x * x + y * y;
    const px = rad(p[0] - a[0]) * Math.cos(rad(a[1])) * 6371008.8;
    const py = rad(p[1] - a[1]) * 6371008.8;
    if (!len2) return Math.hypot(px, py);
    const t = Math.max(0, Math.min(1, (px * x + py * y) / len2));
    return Math.hypot(px - t * x, py - t * y);
  };

  let worst = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicular(points[i], points[0], points[points.length - 1]);
    if (d > worst) {
      worst = d;
      index = i;
    }
  }
  if (worst <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

const nearestIndex = (line, target) => {
  let best = 0;
  let bestD = Infinity;
  line.forEach((p, i) => {
    const d = metres(p, target);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return { index: best, distance: bestD };
};

/* --------------------------------------------------------------------- OSRM */

async function routeRoad({ id, label, points }) {
  const path = points.map((p) => `${p[0]},${p[1]}`).join(';');
  const res = await fetch(`${OSRM}/${path}?overview=full&geometries=geojson`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`${id}: OSRM ${res.status}`);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error(`${id}: OSRM ${json.code}`);
  const line = json.routes[0].geometry.coordinates;
  console.log(
    `  ${id.padEnd(9)} ${label.padEnd(24)} ${line.length} pts, ` +
      `${(json.routes[0].distance / 1000).toFixed(1)} km routed`,
  );
  return line;
}

/* ----------------------------------------------------------------- Overpass */

// Route relations list their ways in travel order, but individual ways can be reversed
// relative to that order and a few relations have gaps. Chaining by nearest endpoint
// handles both without needing the members to be perfectly sorted.
function stitch(ways) {
  const pool = ways.filter((w) => w.length > 1);
  if (!pool.length) return [];
  let line = pool.shift().slice();

  while (pool.length) {
    let best = null;
    for (let i = 0; i < pool.length; i += 1) {
      for (const atEnd of [true, false]) {
        for (const reversed of [false, true]) {
          const w = reversed ? pool[i].slice().reverse() : pool[i];
          const gap = atEnd ? metres(line.at(-1), w[0]) : metres(line[0], w.at(-1));
          if (!best || gap < best.gap) best = { i, atEnd, w, gap };
        }
      }
    }
    // A jump of more than a kilometre is a different branch, not the next segment.
    if (!best || best.gap > 1000) break;
    pool.splice(best.i, 1);
    line = best.atEnd ? [...line, ...best.w] : [...best.w, ...line];
  }
  return line;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every public Overpass instance 504s or rate-limits under load, and none of them is
// reliably up. Rotate through the mirrors, twice, before giving up.
async function overpass(query) {
  let last = 'no mirror tried';
  for (let round = 0; round < 2; round += 1) {
    for (const host of OVERPASS) {
      try {
        const res = await fetch(host, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) {
          last = `${new URL(host).host} → ${res.status}`;
          await sleep(2000);
          continue;
        }
        return await res.json();
      } catch (err) {
        last = `${new URL(host).host} → ${err.message}`;
      }
    }
    await sleep(5000);
  }
  throw new Error(`Overpass unavailable (last: ${last})`);
}

const waysFrom = (elements) =>
  elements
    .filter((e) => e.type === 'way' && Array.isArray(e.geometry))
    .map((e) => e.geometry.map((g) => [Number(g.lon.toFixed(6)), Number(g.lat.toFixed(6))]));

// Cut an out-and-back at its turning point: the vertex furthest from the start is the
// far end, and everything after it is the return carriageway.
function toFurthest(line) {
  let best = 0;
  let bestD = -1;
  line.forEach((p, i) => {
    const d = metres(line[0], p);
    if (d > bestD) {
      bestD = d;
      best = i;
    }
  });
  return line.slice(0, best + 1);
}

async function fetchWays({ id, label, query, oneCarriageway }) {
  const json = await overpass(query);
  const ways = waysFrom(json.elements);
  if (!ways.length) throw new Error(`${id}: query returned no ways`);
  let line = stitch(ways);
  if (oneCarriageway) line = toFurthest(line);
  console.log(
    `  ${id.padEnd(9)} ${label.padEnd(24)} ${ways.length} ways → ${line.length} pts, ` +
      `${(lengthOf(line) / 1000).toFixed(1)} km`,
  );
  return line;
}

async function routeRail({ id, label, relation, clip }) {
  // `out geom` on the relation itself returns member geometry inline — one request
  // instead of a recursed `way(r)`, which is what times out on the busy mirrors.
  const json = await overpass(`[out:json][timeout:180];relation(${relation});out geom;`);
  const rel = json.elements.find((e) => e.type === 'relation');
  const ways = (rel?.members ?? [])
    .filter((m) => m.type === 'way' && Array.isArray(m.geometry))
    .map((m) => m.geometry.map((g) => [Number(g.lon.toFixed(6)), Number(g.lat.toFixed(6))]));
  if (!ways.length) throw new Error(`${id}: relation ${relation} returned no way geometry`);

  let line = stitch(ways);

  if (clip) {
    const a = nearestIndex(line, clip[0]);
    const b = nearestIndex(line, clip[1]);
    if (a.distance > 1500 || b.distance > 1500) {
      throw new Error(`${id}: clip points are ${Math.round(Math.max(a.distance, b.distance))} m off the line`);
    }
    const [from, to] = a.index <= b.index ? [a.index, b.index] : [b.index, a.index];
    line = line.slice(from, to + 1);
  }

  console.log(
    `  ${id.padEnd(9)} ${label.padEnd(24)} ${ways.length} ways → ${line.length} pts, ` +
      `${(lengthOf(line) / 1000).toFixed(1)} km`,
  );
  return line;
}

/* ---------------------------------------------------------------------- main */

const TOLERANCE = 12; // metres

console.log('Routing road corridors (OSRM)…');
const roads = [];
for (const spec of ROADS) roads.push([spec.id, await routeRoad(spec)]);

console.log('Fetching corridors held as OSM ways…');
const ways = [];
for (const spec of WAYS) ways.push([spec.id, await fetchWays(spec)]);

console.log('Fetching rail corridors (OpenStreetMap route relations)…');
const rails = [];
for (const spec of RAILS) rails.push([spec.id, await routeRail(spec)]);

const features = [...roads, ...ways, ...rails].map(([id, line]) => {
  const thinned = simplify(line, TOLERANCE).map((p) => [
    Number(p[0].toFixed(5)),
    Number(p[1].toFixed(5)),
  ]);
  console.log(`  ${id.padEnd(9)} ${line.length} → ${thinned.length} pts after simplify`);
  return { id, coordinates: thinned };
});

const body = features
  .map(
    ({ id, coordinates }) =>
      `  line('${id}', [\n` +
      coordinates
        .reduce((rows, c, i) => {
          const row = Math.floor(i / 4);
          (rows[row] ??= []).push(`[${c[0]}, ${c[1]}]`);
          return rows;
        }, [])
        .map((row) => `    ${row.join(', ')},`)
        .join('\n') +
      `\n  ]),`,
  )
  .join('\n');

const out = `// GENERATED by scripts/build-corridors.mjs — do not edit by hand.
// Run \`npm run assets:corridors\` to rebuild.
//
// Road corridors are real OSRM driving geometry; rail and metro corridors are the
// geometry of their OpenStreetMap route relations, simplified to ${TOLERANCE} m. Every one of
// these lines sits on the road or track the basemap itself draws, because it came from
// the same data. See the script for why none of this is hand-authored.

const line = (id, coordinates) => ({
  type: 'Feature',
  properties: { id },
  geometry: { type: 'LineString', coordinates },
});

export const CORRIDORS = {
  type: 'FeatureCollection',
  features: [
${body}
  ],
};
`;

await writeFile(new URL('../src/data/corridors.js', import.meta.url), out);
console.log(`\nWrote src/data/corridors.js — ${features.length} corridors.`);
