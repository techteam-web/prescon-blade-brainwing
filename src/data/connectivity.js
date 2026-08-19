// The connectivity list from the brochure, grouped under its four categories
// (Residences / Hospitality / Commerce / Enterprise) with a real coordinate on every row.
//
// `at` is [lng, lat] for the actual place, so selecting a row can fly the map there and
// draw a line to it. Coordinates match landmarks.js (src/data/landmarks.js) where a row
// shares a place with the map dots — those are confirmed. The rest (Raheja Artesia,
// Naman Xana, Blue Sea, Ikea) aren't in any public geocoder at building level, so they're
// pinned to the nearest identifiable point instead: Raheja Artesia to the adjacent Omkar
// 1973 tower, Naman Xana to Worli Seaface road, Blue Sea to Khan Abdul Gaffar Khan Marg
// (its street), Ikea to Kamala Mills Compound (its own listed address). `km` is the live
// OSRM driving distance from PROJECT (see routing.js) for every row, not a straight line.
//
// `cat` matches a filter id in content.js (residences/hospitality/commerce/enterprise) so
// the category buttons on the Location screen actually narrow the list.

export const CONNECTIVITY = [
  // -------------------------------------------------------------- 1. Residences
  { id: 'Oberoi 360 West', label: 'Oberoi 360 West', km: 1.9, cat: 'residences', at: [72.8233159, 19.0110804] },
  { id: 'Raheja Artesia', label: 'Raheja Artesia', km: 1.7, cat: 'residences', at: [72.8234397, 19.0093692] },
  { id: 'Indiabulls Blu', label: 'Indiabulls Blu', km: 0.4, cat: 'residences', at: [72.8205492, 18.9973235] },
  { id: 'Naman Xana', label: 'Naman Xana', km: 1.9, cat: 'residences', at: [72.8173474, 19.0108243] },
  { id: 'Palais Royale', label: 'Palais Royale', km: 1.0, cat: 'residences', at: [72.8204114, 18.9991667] },

  // -------------------------------------------------------------- 2. Hospitality
  { id: 'St Regis', label: 'St Regis', km: 2.0, cat: 'hospitality', at: [72.8238429, 18.994269] },
  { id: 'Four Seasons', label: 'Four Seasons', km: 0.8, cat: 'hospitality', at: [72.8200655, 18.993915] },
  { id: 'Blue Sea', label: 'Blue Sea', km: 2.5, cat: 'hospitality', at: [72.8179428, 19.016009] },
  { id: 'NSCI', label: 'NSCI', km: 1.9, cat: 'hospitality', at: [72.8154765, 18.9863678] },
  { id: 'Mahalaxmi Race Course', label: 'Mahalaxmi Race Course', km: 1.7, cat: 'hospitality', at: [72.8200753, 18.9842089] },

  // -------------------------------------------------------------- 3. Commerce
  { id: 'Palladium Mall', label: 'Palladium Mall', km: 2.0, cat: 'commerce', at: [72.825031, 18.994459] },
  { id: 'Atria Mall', label: 'Atria Mall', km: 1.1, cat: 'commerce', at: [72.8144358, 18.9912457] },
  { id: 'Ikea', label: 'Ikea', km: 1.7, cat: 'commerce', at: [72.827901, 19.004002] },

  // -------------------------------------------------------------- 4. Enterprise
  { id: 'Cnergy IT Park', label: 'Cnergy IT Park', km: 2.7, cat: 'enterprise', at: [72.8280996, 19.0126551] },
  { id: 'Birla Centurion', label: 'Birla Centurion', km: 1.4, cat: 'enterprise', at: [72.8243989, 19.0066766] },
  { id: 'Peninsula Business Park', label: 'Peninsula Business Park', km: 1.1, cat: 'enterprise', at: [72.8292074, 18.9987555] },
  { id: 'Kamala Mills', label: 'Kamala Mills', km: 1.7, cat: 'enterprise', at: [72.827901, 19.004002] },
];

export const CONNECTIVITY_BY_ID = Object.fromEntries(CONNECTIVITY.map((c) => [c.id, c]));
