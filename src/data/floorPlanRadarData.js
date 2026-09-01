

export const BUILDING_ID = 'the-blade';

export const RADAR_SCOPES = ['room', 'floor', 'building'];

// The recurring pair on every "typical floor" plate that has only two clickable
// regions: a large unit wrapping the south side of the floor, and a smaller one on the
// opposite, north-east corner (34th, 35th, 36th–40th all share this footprint — see the
// Office_1/Office_2 (or Office_1/Refuge) bounding boxes in each plate's SVG).
//
// South opens facing due South and can still be dragged all the way round through SE,
// SW and W to NW (a 180°-wide window, 135°→315°, centred on SW) — but never into the
// North/NE/East arc, which is the other unit's window, not this one's, to show.
const SOUTH_PANNING_TO_NW = { yawDeg: 180, panDeg: 180, panCenterDeg: 225 };
// North-East has nothing else on the floor to look toward, so it stays fully fixed.
const NORTH_EAST_FIXED = 45;

// Every other panorama floor's own clickable regions (regionName, straight off each
// plate's SVG — see the id lists in the comment above), each starting at the same 150°
// window DEFAULT_PAN_DEG already gives them for free. Written out explicitly, one entry
// per unit, so there is a single obvious spot per room to hand-tune: change panDeg to
// widen or narrow how far that unit's click can look around, add yawDeg to open it
// facing a specific direction instead of wherever the click landed, or pitchDeg/fovDeg
// to adjust tilt/zoom. See the field-by-field rundown in the comment at the top of this
// file. Leaving a unit's panDeg at 150 (rather than deleting the entry) keeps the region
// name visible here as a checklist of what's left to walk and dial in.
export const RADAR_OVERRIDES = {
  building: {},
  floor: {},
  room: {
    [BUILDING_ID]: {
      '34th Floor': {
        Office_1: { yawDeg: 0, panRightDeg: 90, panLeftDeg: 140},
        Office_2: { yawDeg:225,  panRightDeg: 5, panLeftDeg: 90},
      },
      // 35th Floor has only one sellable unit — Office_1 — plus a life-safety refuge
      // area in the same north-east corner Office_2 occupies on the other floors. It's
      // still a clickable shape (FloorPlanOverlay doesn't special-case it), so it gets
      // the same fixed NE framing rather than an unpredictable, unspecified one.
      '35th Floor': {
        Office_1: { yawDeg: 0, panRightDeg: 90, panLeftDeg: 200},
        Refuge:  { yawDeg:225,  panRightDeg: 5, panLeftDeg: 90},
      },
      '40th Floor': {
        Office_1: { yawDeg: 0, panRightDeg: 90, panLeftDeg: 200},
        Office_2: { yawDeg:225,  panRightDeg: 5, panLeftDeg: 90},
      },

      // 16th–18th Floor (svg: "16TH 17TH AND 18TH FLOOR.svg"). Note the source SVG's own
      // typo in the fourth id — "_0ffice_6_7" (a zero, not a letter O) — regionName has
      // to match it exactly since it comes straight off the clicked shape's id.
      //
      // yawDeg is from the client's own compass sheet for this floor: offices 1–5 (the
      // Office_2_3/Office_4_5 shapes cover the sold-as-one 2+3 and 4+5 pairs) all face
      // due North; the two offices in the south-west corner (_0ffice_6_7) face South-West.
      //
      // (Corrected from an earlier South/South-East reading of the same sheet — the
      // Office_4_5-only "narrow window toward the corner unit" tweak that went with that
      // reading is dropped here rather than carried over rotated, since it was a manual
      // extra on top of the data, not itself part of the sheet.)
      '18th Floor': {
        // Opens facing North (0°), same as its neighbours, but can only be dragged as
        // far as South-West (225°) — the natural way round, turning through West rather
        // than back through East/South. That's a 135°-wide window centred on 292.5°
        // (WNW), with the opening yaw sitting right at the window's own North edge.
        Office_1: { yawDeg: 0, panDeg: 135, panCenterDeg: 292.5 },
        Office_2_3: { yawDeg: 0, panDeg: 4 },
       Office_4_5: {  yawDeg: 0, panLeftDeg: 2, panRightDeg: 90},
        _0ffice_6_7: { yawDeg: 225,  panLeftDeg: 90},
       },
   
      '20th Floor': {
        Office_1: { yawDeg: 0, panRightDeg: 3, panLeftDeg:180 },
        Office_2: { yawDeg: 0, panRightDeg: 90, panLeftDeg:3 },
        Refuge: { yawDeg:225, panRightDeg: 4, panLeftDeg:90 },
      },
      '27th Floor': {
        Office_1: { yawDeg: 0, panRightDeg:3, panLeftDeg:200 },
        Office_2: { yawDeg: 0, panRightDeg: 90, panLeftDeg:3 },
        Refuge: { yawDeg:225, panRightDeg: 4, panLeftDeg:90 },
      },
      // 21st–26th Floor (svg: "19TH AND 21ST TO 26TH FLOOR.svg"). "office_4" is
      // lower-case in the source SVG — again, has to match exactly.
      '25th Floor': {
        Office_1: { yawDeg: 0, panLeftDeg:180, panRightDeg:5},
        Office_2: { yawDeg: 0, panDeg: 4 },
        Office_3: {  yawDeg: 0, panLeftDeg: 2, panRightDeg: 90},
        office_4: { yawDeg: 225, panLeftDeg: 90 },
      },
      '29th Floor': {
        Office_1:  { yawDeg: 0, panLeftDeg:180, panRightDeg:5},
        Office_2: { yawDeg: 0, panLeftDeg:3, panRightDeg:3},
        Office_3:  { yawDeg: 0, panLeftDeg:3, panRightDeg:90},
        Office_4:  { yawDeg: 225, panLeftDeg:90, panRightDeg:5},
      },
      '32nd Floor': {
        Office_1: { yawDeg: 0, panLeftDeg:180, panRightDeg:5},
        Office_2: { yawDeg: 0, panLeftDeg:3, panRightDeg:3},
        Office_3: { yawDeg: 0, panLeftDeg:3, panRightDeg:90},
        Office_4: { yawDeg: 225, panLeftDeg:90, panRightDeg:5},
      },
    },
  },
};
