// RERA carpet areas, verbatim from the brochure. `sqm` on the plate is the floor total
// in square metres; `total` is the same figure in square feet.
//
// A unit with a `status` ('RESERVED' | 'REFUGE') has no area: it renders in
// blade-rose with a copper dot on its unit cell.

export const FLOOR_PLATES = {
  'plan-15': {
    label: '15th Floor',
    sqm: 829.15,
    total: 8925,
    units: [
      { u: 'OFF 1', sqm: 329.34, sqft: 3545 },
      { u: 'OFF 2 & 3', sqm: 144, sqft: 1550 },
      { u: 'OFF 4 & 5', sqm: 167.22, sqft: 1800 },
      { u: 'OFF 6', sqm: 188.59, sqft: 2030 },
      { u: 'OFF 7', sqm: null, sqft: null, status: 'RESERVED' },
    ],
  },
  'plan-16-18': {
    label: '16th, 17th & 18th Floor',
    sqm: 917.41,
    total: 9875,
    units: [
      { u: 'OFF 1', sqm: 319.58, sqft: 3440 },
      { u: 'OFF 2 & 3', sqm: 144, sqft: 1550 },
      { u: 'OFF 4 & 5', sqm: 167.22, sqft: 1800 },
      { u: 'OFF 6 & 7', sqm: 286.6, sqft: 3085 },
    ],
  },
  'plan-19-26': {
    label: '19th & 21st to 26th Floor',
    sqm: 917.41,
    total: 9875,
    units: [
      { u: 'OFF 1', sqm: 319.58, sqft: 3440 },
      { u: 'OFF 2', sqm: 144, sqft: 1550 },
      { u: 'OFF 3', sqm: 167.22, sqft: 1800 },
      { u: 'OFF 4', sqm: 286.6, sqft: 3085 },
    ],
  },
  'plan-20-27': {
    label: '20th & 27th Floor',
    sqm: 674.46,
    total: 7260,
    units: [
      { u: 'OFF 1', sqm: 433.85, sqft: 4670 },
      { u: 'OFF 2', sqm: 240.62, sqft: 2590 },
      { u: 'OFF 4', sqm: null, sqft: null, status: 'REFUGE' },
    ],
  },
  'plan-29': {
    label: '29th Floor',
    sqm: 822.19,
    total: 8850,
    units: [
      { u: 'OFF 1', sqm: 276.38, sqft: 2975 },
      { u: 'OFF 2', sqm: 132.39, sqft: 1425 },
      { u: 'OFF 3', sqm: 154.22, sqft: 1660 },
      { u: 'OFF 4', sqm: 259.2, sqft: 2790 },
    ],
  },
  'plan-30-33': {
    label: '30th to 33rd Floor',
    sqm: 918.8,
    total: 9890,
    units: [
      { u: 'OFF 1', sqm: 319.58, sqft: 3440 },
      { u: 'OFF 2', sqm: 145.39, sqft: 1565 },
      { u: 'OFF 3', sqm: 167.22, sqft: 1800 },
      { u: 'OFF 4', sqm: 286.6, sqft: 3085 },
    ],
  },
  'plan-34': {
    label: '34th Floor',
    sqm: 959.68,
    total: 10330,
    units: [
      { u: 'OFF 1', sqm: 673.08, sqft: 7245 },
      { u: 'OFF 2', sqm: 286.6, sqft: 3085 },
    ],
  },
  'plan-35': {
    label: '35th Floor',
    sqm: 676.79,
    total: 7285,
    units: [{ u: 'OFF 1', sqm: 676.79, sqft: 7285 }],
  },
  'plan-36-40': {
    label: '36th to 40th Floor',
    sqm: 999.63,
    total: 10760,
    units: [
      { u: 'OFF 1', sqm: 713.02, sqft: 7675 },
      { u: 'OFF 2', sqm: 286.6, sqft: 3085 },
    ],
  },
};

export const getPlate = (id) => (id ? FLOOR_PLATES[id] ?? null : null);
