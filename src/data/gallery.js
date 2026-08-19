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
  'blade-12', // Entrance lobby — the arrival
  'blade-05', // Arrival plaza, water walls and planting
  'blade-06', // Grand Hall, dark vein stone and commissioned sculpture
  'blade-07', // The Upper Retreat — café and terrace
  'blade-08', // The Members' Lounge — library to private dining
  'blade-09', // The Crown — sports bar
  'blade-03', // A typical office floor at dusk
  'blade-04', // The podium and porte-cochère at night
  'render-01',
  'render-02',
  'render-05',
  'render-06',
];

// Features. One backdrop per slide, in slide order. Every one is landscape, because a
// portrait render behind a full-width slide crops to nothing.
export const FEATURE_BACKDROPS = [
  'render-01', // The Vision
  'render-022', // Design & Façade — the fin detail at sunset
  'blade-10', // Lifestyle Floors — aerial dusk
  'render-05', // Why The Blade
  'render-02', // Salient Features
  'blade-03', // Specifications — an office floor
  'blade-02', // Sustainability — aerial over the seafront
  'blade-11', // Partners — the site at dusk
  'render-09', // The Developer — the cover hero
];

// The menu's full-bleed backdrop, one per section.
export const MENU_BACKDROPS = {
  views: 'blade-10',
  amenities: 'blade-12',
  plans: 'blade-03',
  location: 'blade-02',
  features: 'blade-01',
};
