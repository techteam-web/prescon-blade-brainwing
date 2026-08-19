// Five screens. This is a sales instrument, not a PDF viewer — every screen here is one
// a broker actually stops on and works from.
//
// `caption` is the mandatory compliance caption for that screen (Indian real-estate
// marketing requirement). `null` means the screen carries no render or map.

export const SECTIONS = [
  { id: 'views', no: '01', label: 'Views', caption: null},
  { id: 'amenities', no: '02', label: 'Amenities', caption: null},
  { id: 'plans', no: '03', label: 'Floor Plans', caption: null },
  { id: 'location', no: '04', label: 'Location', caption: null},
  { id: 'features', no: '05', label: 'Features', caption: null },
];

export const SECTION_IDS = SECTIONS.map((s) => s.id);

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

export const sectionIndex = (id) => SECTIONS.findIndex((s) => s.id === id);
