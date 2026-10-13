// Curated running orders. Nothing reads "every render in renders.js" any more — that
// pulled in near-duplicate options of the same shot and dragged the tail of the gallery
// down. These lists are hand-picked and hand-ordered.
//
//   render-01…09  the exterior renders folder, plus the page-1 cover hero
//   blade-01…12   the Links working folder (finished renders only; the cut-out plates,
//                 AI studies and line illustrations in there are not ingested at all)

// Amenities. Exteriors set the scene, then the interiors carry it — those are what the
// amenity floors actually are, and they were missing entirely before.
export const AMENITY_GALLERY = [
  'amenity-13', // The Upper Retreat — 12F
  'amenity-14', // The Members' Lounge — 13F
  'amenity-15', // The Crown — 41F
];

// Maps a render id above to its matching CONTENT.gallery entry (src/data/content.js),
// so the Amenities screen can pair the client's copy — headline, level, body, bullet
// list — with its render. A render with no entry here gets no text panel and stays the
// plain full-bleed slide.
export const AMENITY_PANEL_BY_RENDER = {
  'amenity-13': 'retreat',
  'amenity-14': 'lounge',
  'amenity-15': 'crown',
};

// The plate under each Gallery slide — reference screenshot: a title, then "ARTIST'S
// IMPRESSION" beneath it. Titles are pulled from what's already established elsewhere
// rather than invented: the client's own space names in CONTENT.gallery (src/data/
// content.js) and its `list` entries, matched against the descriptive comments already
// on GALLERY_RENDERS below. Where a render has no named space behind it (an exterior or
// site-context shot), the title is a plain, factual description of the shot itself —
// never marketing copy — same rule as content.js's own LAW 4.
export const GALLERY_CAPTIONS = {
 

    'blade-05' : 'Garden Court',
  'blade-06' : ' Members Lounge ',
  'blade-07': 'Indoor Cafeteria',
  'blade-09' : 'Restaurant & Bar',
  'blade-03': 'Sky Lounge Office',
  'blade-04':'Arrival Plaza',
  'blade-08' : 'Library',
  'view-01' : 'West Facade View',
  'view-02': 'West Facade View',
  'view-03' : 'Worm Eye View',
  'view-04' : 'Multi-Level Ramp Parking',
  'view-05' : '12th Floor Upper Retreat',
  'view-06' : 'Birds Eye View',
  'restaurant': "Restaurant",
  'screenroom': "Screen Room",
  '1-view-1': "West Facade View",
  '2-view-2': "West Facade View",
  '3-view-3': "Worm's Eye View",
  '4-view-4': "Multi-Level Ramp Parking",
  '5-view-5': "12th Floor Upper Retreat",
  '6-view-6': "Birds Eye View",
  '7-view-7': "North View Elevation",
  '8-view-8': "Arrival Lounge",
  '9-view-9': "Water Feature"
};

// Gallery slides that are a real photograph, not a 3D render — the plate under these
// reads "Stock Image" instead of "Artist's Impression" (Gallery.jsx).
export const GALLERY_STOCK_IDS = new Set([
  'blade-05',
  'blade-06',
  'blade-07',
  'blade-09',
  'blade-03',
  'blade-04',
  'blade-08',

]);

// Gallery menu entry. Independent of AMENITY_GALLERY above — editing one must never
// change the other — so it carries its own full running order, unaffected by whatever
// the Amenities screen curates.
export const GALLERY_RENDERS = [
    '1-view-1',
  '2-view-2',
  '3-view-3',
  '4-view-4',
  '5-view-5',
  '6-view-6',
  '7-view-7',
  '8-view-8',
  '9-view-9',
  'restaurant',
  'screenroom',

  
 

];

// Features. One backdrop per slide, in slide order. Every one is landscape, because a
// portrait render behind a full-width slide crops to nothing.
export const FEATURE_BACKDROPS = [
  'render-04', // Design & Façade — the fin detail at sunset
  'blade-03', // Tech Specs — an office floor
  'blade-02', // Green Building Features — aerial over the seafront
  'blade-11', // Our Partners — the site at dusk
];

// The menu's full-bleed backdrop, one per section.
export const MENU_BACKDROPS = {
  views: 'blade-10',
  profile: 'blade-04', // the podium at night — an establishing shot for the section diagram
  gallery: 'blade-12', // same as amenities — the entrance lobby, its arrival shot
  amenities: 'blade-07',
  plans: 'blade-03',
  location: 'blade-02',
  features: 'blade-01',
  group: 'group-02',
};
