// The connectivity list from the brochure, grouped under its four categories
// (Residences / Hospitality / Commerce / Enterprise) with a real coordinate on every row.
//
// `at` is [lng, lat] for the actual place, so selecting a row can fly the map there and
// draw a line to it. Coordinates match landmarks.js (src/data/landmarks.js) where a row
// shares a place with the map dots — those are confirmed. Ikea is its own confirmed
// building-level coordinate too. The rest (Raheja Artesia, Naman Xana, Blue Sea) aren't
// in any public geocoder at building level, so they're pinned to the nearest identifiable
// point instead: Raheja Artesia to the adjacent Omkar 1973 tower, Naman Xana to Worli
// Seaface road, Blue Sea to Khan Abdul Gaffar Khan Marg (its street). `km` is the live
// OSRM driving distance from PROJECT (see routing.js) for every row, not a straight line.
//
// `cat` matches a filter id in content.js (residences/hospitality/commerce/enterprise) so
// the category buttons on the Location screen actually narrow the list.
//
// `road` names a street-name landmark in landmarks.js (cat: 'roads') that is a
// confirmed, manually-checked pairing for that destination — not a nearest-neighbour
// guess. Clicking a row focuses it in BladeMap.jsx, which reveals only its `road`'s
// label. Leave the field off a row entirely until its road is actually confirmed.
//
// `finalStretch` is an optional list of [lng, lat] waypoints BladeMap.jsx splices onto
// the end of the OSRM driving route before drawing it. OSRM's driving profile won't
// route onto a way tagged access:private, so for a destination only reachable that way
// (Mahalaxmi Race Course's approach road, confirmed against OSM) the route otherwise
// stops at the public road and leaves a gap to the pin. These points are that private
// road's own real geometry (from OSM, not a straight line), so the drawn route still
// follows an actual path for the stretch OSRM refuses to route.

export const CONNECTIVITY = [
  // -------------------------------------------------------------- 1. Residences
  { id: 'Oberoi 360 West', label: 'Oberoi 360 West', km: 1.9, cat: '', at: [72.8233159, 19.0110804], road: 'gm-bhosale-marg' },
  { id: 'Raheja Artesia', label: 'Raheja Artesia', km: 1.7, cat: 'residences', at: [72.8234397, 19.0093692], road: 'gm-bhosale-marg' },
  { id: 'Indiabulls Blu', label: 'Indiabulls Blu', km: 0.4, cat: 'residences', at: [72.8205492, 18.9973235],road: 'ganapatrao-kadam-marg1'},
  { id: 'Naman Xana', label: 'Naman Xana', km: 1.9, cat: 'residences', at: [72.8173474, 19.0108243],road:'sir-pochkhanawala-rd' },
  { id: 'Palais Royale', label: 'Palais Royale', km: 1.0, cat: 'residences', at: [72.8204114, 18.9991667] , road:'gm'},

  // -------------------------------------------------------------- 2. Hospitality
  { id: 'St Regis', label: 'St Regis', km: 2.0, cat: 'hospitality', at: [72.8238429, 18.994269], road:'dr-elijah-moses-rd'},
  { id: 'Four Seasons', label: 'Four Seasons', km: 0.8, cat: 'hospitality', at: [72.8200655, 18.993915], road:'dr-elijah-moses-rd'},
  { id: 'Blue Sea', label: 'Blue Sea', km: 2.5, cat: 'hospitality', at: [72.8179428, 19.016009], road:'khan-abdul' },
  { id: 'NSCI', label: 'NSCI', km: 1.9, cat: 'hospitality', at: [72.8154765, 18.9863678] , road:'dr-annie'},
  // Pinned to the client's own marked point. OSRM's driving route reaches the public
  // end of Lala Lajpatrai Marg and stops there — the last stretch in is a private
  // service road (access:private in OSM) that public routers won't use. See
  // `finalStretch` above.
  {
    id: 'Mahalaxmi Race Course',
    label: 'Mahalaxmi Race Course',
    km: 1.7,
    cat: 'hospitality',
    at: [72.8156272367974, 18.98221544417475],
    finalStretch: [
      [72.8151554, 18.9826659],
      [72.8154556, 18.9823846],
    ],
  },

  // -------------------------------------------------------------- 3. Commerce
  { id: 'Palladium Mall', label: 'Palladium Mall', km: 2.0, cat: 'commerce', at: [72.825031, 18.994459],road:'dr-elijah-moses-rd'},
  { id: 'Atria Mall', label: 'Atria Mall', km: 1.1, cat: 'commerce', at: [72.8144358, 18.9912457], road:'dr-annie'},
  { id: 'Ikea', label: 'Ikea', km: 1.7, cat: 'commerce', at: [72.8272152500836, 19.005827979283566], road: 'gm-bhosale-marg'},

  // -------------------------------------------------------------- 4. Enterprise
  { id: 'Cnergy IT Park', label: 'Cnergy IT Park', km: 2.7, cat: 'enterprise', at: [72.8280996, 19.0126551] },
  { id: 'Birla Centurion', label: 'Birla Centurion', km: 1.4, cat: 'enterprise', at: [72.8243989, 19.0066766] ,road: 'gm-bhosale-marg'},
  { id: 'Peninsula Business Park', label: 'Peninsula Business Park', km: 1.1, cat: 'enterprise', at: [72.8292074, 18.9987555] },
  { id: 'Kamala Mills', label: 'Kamala Mills', km: 1.7, cat: 'enterprise', at: [72.827901, 19.004002] },

  // -------------------------------------------------------------- 5. Connectivity
  // Aqua Line pinned to Worli metro station (Mumbai Metro Line 3); Western Railway
  // pinned to Prabhadevi station — both real, geocoded points, not placeholders.
  { id: 'Western Express Highway', label: 'Western Express Highway', km: 0.5, cat: 'connectivity', at: [72.819, 19.002],road: 'gm-bhosale-marg'},
  { id: 'Aqua Line', label: 'Aqua Line', km: 0.5, cat: 'connectivity', at: [72.81941, 19.0087] },
  { id: 'Western Railway', label: 'Western Railway', km: 0.5, cat: 'connectivity', at: [72.836527, 19.008085] },
];

export const CONNECTIVITY_BY_ID = Object.fromEntries(CONNECTIVITY.map((c) => [c.id, c]));
