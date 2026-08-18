// Hoverable floor bands over public/assets/tower/tower-elevation.png.
//
// All coordinates are PERCENTAGES of the image box, so the zones scale from mobile to
// 4K without recalculation. The image must be laid out in an aspect-ratio-locked box
// with `object-fit: contain` — under `cover` the crop changes with the viewport and
// every zone drifts off its band.
//
// shape.type 'rect' → a positioned div (current)
// shape.type 'path' → <path d> inside <svg viewBox="0 0 100 100" preserveAspectRatio="none">
// Swapping in the client's SVG cutouts is a per-zone change of `shape`, nothing else.
//
// ---------------------------------------------------------------------------------
// CALIBRATION
//
// The brief's y/h values were estimates against an unextracted image. These are derived
// from two hard anchors measured on the actual extracted PNG (920×3840):
//
//   tower ink            y   32 – 3809
//   copper amenity band  y 2429 – 2636   → 13F + 12F, two floors, 103.5px each
//   copper arrival band  y 3210 – 3427   → Ground Level
//
// From those, three floor heights and a linear stack:
//   office/service (14F–41F)  (2429 − 32) / 28  = 85.6px
//   amenity        (12F–13F)  measured          = 103.5px
//   podium         (1F–11F)   (3210 − 2636) / 11 = 52.2px
//
// The model reproduces the measured tower top to within 0.2px, so the stack is sound.
// It is still a LINEAR model of a 3/4 perspective render, so bands drift slightly from
// the drawn floor lines toward the extremes. Load the Floor Plans screen with `?zones`
// to outline every zone in copper and nudge the constants below until they sit on the
// real bands. Misaligned zones do not ship.
// ---------------------------------------------------------------------------------

const IMG_H = 3840;

// Vertical anchors, in source pixels.
const LOUNGE_TOP = 2429; // top of 13F
const AMENITY_H = 103.5; // 12F and 13F
const OFFICE_H = 85.6; // 14F through 41F
const PODIUM_H = 52.2; // 1F through 11F
const GROUND_TOP = 3210;
const GROUND_H = 217;
const BASE_BOTTOM = 3809;

const pc = (px) => +((px / IMG_H) * 100).toFixed(3);

// Floors above the amenity band stack upward from 13F.
const officeTop = (floor) => LOUNGE_TOP - (floor - 13) * OFFICE_H;
// Podium floors stack downward from the bottom of 12F.
const podiumTop = (floor) => GROUND_TOP - floor * PODIUM_H;

// A generous horizontal band: the tower body spans x 7%–97% for most of its height and
// widens at the plinth. Zones never overlap vertically, so there is no ambiguity in
// being generous, and it keeps every target comfortably over 44px on touch.
const X = 5;
const W = 92;

const band = (topPx, heightPx) => ({
  type: 'rect',
  x: X,
  y: pc(topPx),
  w: W,
  h: pc(heightPx),
});

// Spans of contiguous floors collapse into one zone, matching the plan assets.
const office = (hi, lo = hi) => band(officeTop(hi), (hi - lo + 1) * OFFICE_H);

export const TOWER_ZONES = [
  {
    id: 'crown',
    label: 'The Crown',
    floors: '41F',
    plan: null,
    amenity: 'crown',
    shape: office(41),
  },
  { id: 'f36-40', label: '36th – 40th Floor', floors: '36-40', plan: 'plan-36-40', shape: office(40, 36) },
  { id: 'f35', label: '35th Floor', floors: '35', plan: 'plan-35', shape: office(35) },
  { id: 'f34', label: '34th Floor', floors: '34', plan: 'plan-34', shape: office(34) },
  { id: 'f30-33', label: '30th – 33rd Floor', floors: '30-33', plan: 'plan-30-33', shape: office(33, 30) },
  { id: 'f29', label: '29th Floor', floors: '29', plan: 'plan-29', shape: office(29) },
  {
    id: 'f28',
    label: '28th — Service Floor',
    floors: '28',
    plan: null,
    service: true,
    shape: office(28),
  },
  // 20F and 27F share a plate but are not adjacent, so 27F is the hoverable band and
  // 20F is folded into the 19–26 band below; both resolve to plan-20-27 on click.
  { id: 'f27', label: '27th Floor', floors: '27', plan: 'plan-20-27', shape: office(27) },
  { id: 'f21-26', label: '21st – 26th Floor', floors: '21-26', plan: 'plan-19-26', shape: office(26, 21) },
  { id: 'f20', label: '20th Floor', floors: '20', plan: 'plan-20-27', shape: office(20) },
  { id: 'f19', label: '19th Floor', floors: '19', plan: 'plan-19-26', shape: office(19) },
  { id: 'f16-18', label: '16th – 18th Floor', floors: '16-18', plan: 'plan-16-18', shape: office(18, 16) },
  { id: 'f15', label: '15th Floor', floors: '15', plan: 'plan-15', shape: office(15) },
  {
    id: 'f14',
    label: '14th — Service Floor',
    floors: '14',
    plan: null,
    service: true,
    shape: office(14),
  },
  {
    id: 'f13',
    label: "The Members' Lounge",
    floors: '13',
    plan: null,
    amenity: 'lounge',
    shape: band(LOUNGE_TOP, AMENITY_H),
  },
  {
    id: 'f12',
    label: 'The Upper Retreat',
    floors: '12',
    plan: null,
    amenity: 'retreat',
    shape: band(LOUNGE_TOP + AMENITY_H, AMENITY_H),
  },
  {
    id: 'podium',
    label: '1F – 11F Parking Podiums',
    floors: '1-11',
    plan: null,
    shape: band(podiumTop(11), 11 * PODIUM_H),
  },
  {
    id: 'ground',
    label: 'The Arrival Gallery',
    floors: 'GL',
    plan: null,
    amenity: 'arrival',
    shape: band(GROUND_TOP, GROUND_H),
  },
  {
    id: 'basement',
    label: '-1F / -3F Services & Parking',
    floors: '-1,-3',
    plan: null,
    service: true,
    shape: band(GROUND_TOP + GROUND_H, BASE_BOTTOM - GROUND_TOP - GROUND_H),
  },
];

export const ZONE_BY_ID = Object.fromEntries(TOWER_ZONES.map((z) => [z.id, z]));

// Floor plates only — the compare view has nothing to show for a service or amenity
// floor. Three is the most the compare panel's columns stay legible at.
export const MAX_COMPARE = 3;

// The md breakpoint lays the tower out as a horizontal band across the top. Authored as
// its own x-percentage map rather than derived by rotation: reading order runs ground
// (left) to crown (right), which is the reverse of the vertical stack.
export const TOWER_ZONES_H = [...TOWER_ZONES].reverse().map((z) => ({
  ...z,
  shape: {
    type: 'rect',
    x: +(100 - z.shape.y - z.shape.h).toFixed(3),
    y: X,
    w: z.shape.h,
    h: W,
  },
}));

// The four lifestyle floors, in accent-ramp order. Lifestyle Floors (04) highlights
// these against the same elevation; the ramp tone lives with the content.
export const AMENITY_ZONE_IDS = ['crown', 'f13', 'f12', 'ground'];
