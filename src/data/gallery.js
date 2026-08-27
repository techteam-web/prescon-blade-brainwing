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

// Gallery menu entry. Independent of AMENITY_GALLERY above — editing one must never
// change the other — so it carries its own full running order, unaffected by whatever
// the Amenities screen curates.
export const GALLERY_RENDERS = [
  'blade-12', // Entrance lobby — the arrival
  'blade-05', // Arrival plaza, water walls and planting
  'blade-06', // Grand Hall, dark vein stone and commissioned sculpture
  'blade-07', // The Upper Retreat — café and terrace
  'blade-08', // The Members' Lounge — library to private dining
  'blade-09', // The Crown — sports bar
  'blade-03', // A typical office floor at dusk
  'blade-04', // The podium and porte-cochère at night
  'amenity-13',
  'amenity-14',
  'amenity-15',
  'render-01',
  'render-02',
  'render-05',
  'render-06',
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
  group: 'blade-02',
};
