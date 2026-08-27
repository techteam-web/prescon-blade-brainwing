// Five screens. This is a sales instrument, not a PDF viewer — every screen here is one
// a broker actually stops on and works from.
//
// `caption` is the mandatory compliance caption for that screen (Indian real-estate
// marketing requirement). `null` means the screen carries no render or map.

export const SECTIONS = [
  { id: 'views', no: '01', label: '360 Degree  Panoramic Views', caption: null},
  { id: 'profile', no: '02', label: 'Section Profile', caption: null},
  { id: 'gallery', no: '03', label: 'Gallery', caption: null},
  { id: 'amenities', no: '04', label: 'Amenities', caption: null},
  { id: 'plans', no: '05', label: 'Floor Picker', caption: null },
  { id: 'location', no: '06', label: 'Location Highlights', caption: null},
  { id: 'features', no: '07', label: ' Salient Features', caption: null },
  { id: 'group', no: '08', label: 'Prescon Group', caption: null },
];

export const SECTION_IDS = SECTIONS.map((s) => s.id);

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

export const sectionIndex = (id) => SECTIONS.findIndex((s) => s.id === id);
