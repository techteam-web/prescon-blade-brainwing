// HAND-EDITABLE. Generated once by scripts/ingest-renders.mjs, then never overwritten.
// Re-running the ingest script will not touch this file.
//
// Assigned against what each render actually depicts:
//
//   render-01  dusk close-up of the façade, copper fins against a sunset sky   (5000×2813)
//   render-02  daytime aerial, the tower in its Worli context                  (7556×6750)
//   render-03  full tower from street level, daytime                           (4800×6000, portrait)
//   render-04  ultra-wide fin detail with the city beyond at sunset            (5000×2419)
//   render-05  street-level arrival, porte-cochère and forecourt               (6000×3375)
//   render-06  dusk tower in context, option 01                                (4295×3072)
//   render-07  dusk tower in context, option 02                                (4295×3072)
//   render-08  dusk tower in context, option 03                                (4295×3072)
//   render-09  the cover hero — street level at dusk, Worli skyline            (9761×5491)
//              Extracted from page 1 of the vision PDF, which IS the Landing
//              composition, so the Landing matches the client's own artwork.
//
// `null` means the section has no render: its visual slot stays structurally empty.
// Never substitute placeholder art.
//
//   plans    — the floor plate drawing is the visual.
//   location — the map is the visual.
//
// Views reads its own 360° panoramas from panoramas.js and ignores this map.

export const RENDER_MAP = {
  landing:   'render-09',
  menu:      'render-06',

  views:     'render-03',
  amenities: 'render-05',
  plans:     null,
  location:  null,
  features:  'render-01',
};

export const renderIdFor = (key) => RENDER_MAP[key] ?? null;
