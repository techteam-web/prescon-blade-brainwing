

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
        Office_1: { yawDeg: 0, panRightDeg: 90, panLeftDeg: 100},
        Office_2: { yawDeg:225,  panRightDeg: 40, panLeftDeg: 130},
      },
      // 35th Floor has only one sellable unit — Office_1 — plus a life-safety refuge
      // area in the same north-east corner Office_2 occupies on the other floors. It's
      // still a clickable shape (FloorPlanOverlay doesn't special-case it), so it gets
      // the same fixed NE framing rather than an unpredictable, unspecified one.
      '35th Floor': {
        Office_1: { yawDeg: 0, panRightDeg: 90, panLeftDeg: 140},
        Refuge:  { yawDeg:225,  panRightDeg: 25, panLeftDeg: 140},
      },
      '40th Floor': {
        Office_1: { yawDeg: 0, panRightDeg: 90, panLeftDeg: 100},
        Office_2: { yawDeg:225,  panRightDeg: 40, panLeftDeg: 130},
      },

    

      // (Corrected from an earlier South/South-East reading of the same sheet — the
      // Office_4_5-only "narrow window toward the corner unit" tweak that went with that
      // reading is dropped here rather than carried over rotated, since it was a manual
      // extra on top of the data, not itself part of the sheet.)
      '18th Floor': {
        // Opens facing North (0°), same as its neighbours, but can only be dragged as
        // far as South-West (225°) — the natural way round, turning through West rather
        // than back through East/South. That's a 135°-wide window centred on 292.5°
        // (WNW), with the opening yaw sitting right at the window's own North edge.
        Office_1: {yawDeg:320 ,panLeftDeg:140,panRightDeg:65, panUpDeg: 25},
        Office_2_3: { yawDeg: 0, panLeftDeg:25, panRightDeg:25 ,panUpDeg: 25},
       Office_4_5: {  yawDeg: 45 , panLeftDeg:58, panRightDeg: 90 , panUpDeg: 25},
        _0ffice_6_7: { yawDeg: 250  ,  panLeftDeg:160,panRightDeg:30, panUpDeg: 25},
       },
   
      '20th Floor': {
        Office_1: { yawDeg: 0, panRightDeg:30, panLeftDeg:200 , panUpDeg: 25},
        Office_2: { yawDeg: 0, panRightDeg: 90, panLeftDeg:25, panUpDeg: 25},
        Refuge: { yawDeg:255, panRightDeg: 4, panLeftDeg:170, panUpDeg: 25},
      },
      '27th Floor': {
        Office_1:  { yawDeg: 0, panRightDeg:30, panLeftDeg:200 , panUpDeg: 25},
        Office_2: { yawDeg: 0, panRightDeg: 90, panLeftDeg:25, panUpDeg: 25},
        Refuge:  { yawDeg:255, panRightDeg: 4, panLeftDeg:170, panUpDeg: 25},
      },
      // 21st–26th Floor (svg: "19TH AND 21ST TO 26TH FLOOR.svg"). "office_4" is
      // lower-case in the source SVG — again, has to match exactly.
      '25th Floor': {
        Office_1: {yawDeg:320 ,panLeftDeg:140,panRightDeg:65, panUpDeg: 25},
        Office_2:  { yawDeg: 0, panLeftDeg:25, panRightDeg:25 ,panUpDeg: 25},
        Office_3:  {  yawDeg: 45 , panLeftDeg:58, panRightDeg: 90 , panUpDeg: 25},
        office_4:  { yawDeg: 250  ,  panLeftDeg:160,panRightDeg:30, panUpDeg: 25},
      },
      '29th Floor': {
        Office_1:  { yawDeg: 330, panLeftDeg:180, panRightDeg:50, panUpDeg: 25},
        Office_2: { yawDeg: 0, panLeftDeg:30, panRightDeg:30, panUpDeg: 25},
        Office_3:  { yawDeg:30, panLeftDeg:50, panRightDeg:90, panUpDeg: 25},
        Office_4:  { yawDeg: 235, panLeftDeg:130, panRightDeg:30, panUpDeg: 25},
      },
      '32nd Floor': {
        Office_1: {yawDeg:320 ,panLeftDeg:140,panRightDeg:65, panUpDeg: 25},
        Office_2: { yawDeg: 0, panLeftDeg:25, panRightDeg:25 ,panUpDeg: 25},
        Office_3: {  yawDeg: 45 , panLeftDeg:58, panRightDeg: 90 , panUpDeg: 25},
        Office_4: { yawDeg: 250  ,  panLeftDeg:160,panRightDeg:30, panUpDeg: 25},

      },
    },
  },
};
