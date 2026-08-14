// The 360° view floors, taken from the client's drone-shoot schedule.
//
// `slab` is the floor slab level in metres, verbatim from that schedule — it is what the
// view from each floor is actually shot at, and it is the honest thing to put under a
// panorama.
//
// `src` is an equirectangular (2:1) JPEG in public/assets/panoramas/. Until the drone
// shoot is delivered every src is null, and the viewer shows the floor selector with an
// empty stage rather than substituting a render — a flat render is not a 360° view and
// must never be presented as one.
//
// TODO: client content — equirectangular panoramas from the drone shoot.

export const PANORAMAS = [
  { id: 'f18', floor: 18, label: '18th Floor', offices: 7, slab: 69.8, src: null },
  { id: 'f20', floor: 20, label: '20th Floor', offices: 2, slab: 78.2, src: null },
  { id: 'f25', floor: 25, label: '25th Floor', offices: 4, slab: 99.2, src: null },
  { id: 'f27', floor: 27, label: '27th Floor', offices: 2, slab: 107.6, src: null },
  { id: 'f29', floor: 29, label: '29th Floor', offices: 4, slab: 114.8, src: null },
  { id: 'f32', floor: 32, label: '32nd Floor', offices: 4, slab: 127.4, src: null },
  { id: 'f34', floor: 34, label: '34th Floor', offices: 2, slab: 135.8, src: null },
  { id: 'f35', floor: 35, label: '35th Floor', offices: 1, slab: 140.0, src: null },
  { id: 'f40', floor: 40, label: '40th Floor', offices: 2, slab: 161.0, src: null },
];

export const PANORAMA_BY_ID = Object.fromEntries(PANORAMAS.map((p) => [p.id, p]));

export const hasPanoramas = PANORAMAS.some((p) => p.src);
