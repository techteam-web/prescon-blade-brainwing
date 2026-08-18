// Every string in the application, keyed by section id.
//
// LAW 4 — real content only. All copy here is verbatim from the client's vision
// document. Do not paraphrase, do not invent marketing copy, do not add lorem. A slot
// with no content stays structurally empty with a // TODO: client content marker.

export const LANDING = {
  eyebrow: 'VISION DOCUMENT',
  headline: ['SCULPTED FOR', 'THE DISTINGUISHED,', 'THE INFLUENTIAL,', 'THE POWERFUL.'],
  place: 'Worli Naka',
  enter: 'ENTER EXPERIENCE',
};

export const GATE = {
  enter: 'ENTER FULLSCREEN',
  resume: 'RETURN TO FULLSCREEN',
  unsupported: 'Fullscreen is unavailable on this device. The experience continues as is.',
};

export const SITE = 'www.prescon.in';

export const CONTENT = {
  /* ------------------------------------------------------------------- 01 views */
  views: {
    headline: ['THE VIEW FROM', 'EVERY ALTITUDE'],
    body:
      'Twenty-six office floors, each with its own horizon. Select a level to look out ' +
      'from it.',
    hint: 'Drag to look around · ↑ ↓ to change floor',
    empty: 'Panorama pending — drone capture scheduled for this level.',
  },

  /* --------------------------------------------------------------- 02 amenities */
  // The four lifestyle experiences, verbatim. Each is a render with its own heading;
  // the page is a gallery, navigated by arrow keys or the on-screen controls.
  amenities: [
    {
      id: 'arrival',
      index: 'The Arrival Gallery',
      level: 'Ground Level',
      headline: ['FOR BUSINESSES THAT', 'DO NOT MAKE', 'SMALL ENTRANCES'],
      body:
        'An arrival powerful businesses deserve, and then some more. Its Neo Deco ' +
        "language, our contemporary homage to Mumbai's deco legacy, gives the space a " +
        'distinct lifestyle poise while hosting, gathering and leaving a mark of ' +
        'distinction.',
      list: ['Arrival Plaza', 'Garden Court', 'Grand Hall'],
    },
    {
      id: 'retreat',
      index: 'The Upper Retreat',
      level: '12F',
      headline: ['THE VERDANT SIDE', 'OF BUSINESS'],
      body:
        'A double-height entrance hall opens onto an outdoor terrace, framed by travertine ' +
        'flooring and lush mature foliage. More than a café floor, it becomes a greener, ' +
        'more leisurely setting for long lunches, deeper conversations, team gatherings and ' +
        'unhurried strolls.',
      list: [
        'Indoor Cafeteria',
        'Curated F&B',
        'Landscape Terrace',
        'Social Spaces',
        'Amphitheatre',
      ],
    },
    {
      id: 'lounge',
      index: "The Members' Lounge",
      level: '13F',
      headline: ['YOUR SECOND OFFICE', 'WITHOUT THE SECOND LEASE'],
      body:
        'A fully serviced business lounge beyond your own office space. From fluted timber ' +
        'columns to cognac leather seating, every detail feels exceptional. Whether it’s ' +
        'quarterly reviews, the next big Unicorn idea, client presentations or channel ' +
        'partner meets, this is where business comes together better.',
      list: [
        'Boardroom Suites',
        'Contemporary Workspaces',
        'Screening Room',
        'Convertible Library to Private Dining',
      ],
    },
    {
      id: 'crown',
      index: 'The Crown',
      level: '41F',
      headline: ['LIFE SHOULD MATCH', 'THE SEAT YOU HAVE EARNED.'],
      body:
        "A private members' club at the tower's highest level, designed for those used to " +
        'the finest. Recharge and entertain in spaces crafted in rich materials like ' +
        'Calacatta Viola, Verde Alpi and brushed brass. A privilege that lets life rise to ' +
        'the level you have reached.',
      list: ['Sports Bar', 'Lounge Services', 'Grade A Hospitality', 'Alfresco Seating'],
    },
  ],

  /* ------------------------------------------------------------------- 03 plans */
  plans: {
    tableTitle: 'RERA CARPET AREA',
    units: { sqft: 'SQ.FT', sqm: 'SQ.M' },
  },

  /* ---------------------------------------------------------------- 04 location */
  location: {
    headline: ['BETTER BUSINESS.', 'CLOSER, SWIFTER.'],
    filters: [
      { id: 'residences', label: 'Residences', tone: 'cream' },
      { id: 'hospitality', label: 'Hospitality', tone: 'copper' },
      { id: 'commerce', label: 'Commerce', tone: 'terracotta' },
      { id: 'enterprise', label: 'Enterprise', tone: 'rose' },
    ],
  },
};

/* ------------------------------------------------------------------ 05 features */
// The features deck. One idea per slide, advanced by click, arrow keys or swipe.
// Every string is verbatim from the vision document — this deck is where the material
// that used to be spread across eight separate screens now lives.
export const FEATURE_SLIDES = [
  {
    id: 'vision',
    kind: 'statement',
    eyebrow: 'The Vision',
    headline: ['INTRODUCING', 'THE FINEST EDGE OF', 'MODERN BUSINESS'],
    body:
      'At the epicentre of Worli, The Blade by Prescon rises as a Grade A icon for the ' +
      "city's more discerning order of business. With a level of hospitality rarely seen " +
      'in a local business address, it is crafted for boards, family offices and global ' +
      'capital that quietly shape Mumbai.',
    footnote: 'INSPIRED BY ICONIC DESIGNS',
    items: [
      { name: 'Flatiron', meta: 'New York, 1902' },
      { name: 'The Shard', meta: 'London, 2012' },
      { name: 'The Cheesegrater', meta: 'London, 2014' },
    ],
  },
  {
    id: 'design',
    kind: 'columns',
    eyebrow: 'Design & Façade',
    headline: ['SCULPTED, NOT BUILT.'],
    body:
      'A façade composed of fluted copper fins, ribbed champagne metal and dark vein ' +
      'stone. A crown that reveals itself only at the skyline. A jewel-like signature ' +
      'engineered for dusk.',
    columns: [
      { eyebrow: 'FORM', subtitle: 'Sculpted silhouette', body: 'Tapered reveals, deeper setbacks, a defined crown.' },
      { eyebrow: 'MATERIAL', subtitle: 'Crafted, not clad', body: 'Fluted copper fins, ribbed champagne mesh, dark vein stone portals.' },
      { eyebrow: 'PRECISION', subtitle: 'Engineered restraint', body: 'Foster-grade detailing across mullions, reveals & corner geometry.' },
      { eyebrow: 'LIGHT', subtitle: 'A skyline at dusk', body: 'Backlit fins and an illuminated blade edge.' },
    ],
  },
  {
    id: 'lifestyle',
    kind: 'stack',
    eyebrow: 'Lifestyle Floors',
    headline: ['BUSINESS-LIFE, FINELY COMPOSED.'],
    body:
      'Most towers stack offices. The Blade by Prescon arranges them with greater intent. ' +
      'It introduces four distinct lifestyle experiences at different altitudes, each one ' +
      'giving the day a finer rhythm.',
    floors: [
      { id: 'crown', code: '41F', height: '+165m', name: 'The Crown', tone: 'cream' },
      { id: 'lounge', code: '13F', height: '+50m', name: "The Members' Lounge", tone: 'copper' },
      { id: 'retreat', code: '12F', height: '+47m', name: 'The Upper Retreat', tone: 'terracotta' },
      { id: 'arrival', code: 'GL', height: '0m', name: 'The Arrival Gallery', tone: 'rose' },
    ],
  },
  {
    id: 'strengths',
    kind: 'grid',
    eyebrow: 'Why The Blade',
    headline: ['A CUT ABOVE,', 'IN EVERY DISCIPLINE.'],
    grid: [
      {
        heading: 'Architecture',
        items: ['Bespoke Grade A Tower', 'Sharp, High-Visibility Silhouette', 'Low-E DGU Facade', 'Metal-clad Columns', 'Iconic Crown'],
      },
      {
        heading: 'Workplace',
        items: ['Flat Slab, Columnless, Bare-Shell Floor Plates', 'Complete Flexibility in Planning', 'Zone-Wise Elevator Planning for minimal wait time', '2 Service Elevators incl. Fire Evacuation'],
      },
      {
        heading: 'Infrastructure',
        items: ['Superlative parking ratio at 1:590 with ramp access', '4.2 m floor to floor height', '3 tier security', '100% Power Backup', 'High-Speed Passenger Elevators'],
      },
      {
        heading: 'Lifestyle',
        items: ['An Uber Luxury Arrival Experience', 'A Landscaped Social Lifestyle Floor', 'A Fully Serviced Members’ Business Lounge', 'A Rooftop Hospitality Space'],
      },
    ],
  },
  {
    id: 'salient',
    kind: 'rows',
    eyebrow: 'Salient Features',
    headline: ['THE BUILDING,', 'IN NUMBERS.'],
    rows: [
      { label: 'Building structure', value: '3B + Gr.+ 1st to 11th parking podiums + 12th & 13th recreational / Amenity floors + 14th Service floor + 15th to 40th typical office floors incl 28th Service floor + 41st (part) Office / F&B floor.' },
      { label: 'Handover condition', value: 'Bareshell.' },
      { label: 'Total development', value: 'Around 5.60 Lacs Sq.ft.' },
      { label: 'Typical floor area (RERA carpet)', value: 'Low rise ~38,000 Sq.Ft. · Mid rise ~1,32,000 Sq.Ft. · High rise ~76,000 Sq.Ft.' },
      { label: 'Car park', value: '02 Basements + 11 podiums.' },
      { label: 'Common floors', value: 'Grand entrance lobby on Ground & 2 Amenity floors (12th & 13th level).' },
      { label: 'Total building height', value: '178 m AMSL to top elevation.' },
      { label: 'Slab to slab', value: 'Entrance Lobby 7.20 m · Office Levels 4.2 m.' },
    ],
  },
  {
    id: 'systems',
    kind: 'rows',
    eyebrow: 'Specifications',
    headline: ['ENGINEERED', 'TO GRADE A.'],
    rows: [
      { label: 'Façade glazing', value: 'Low-E Double Glazed unit (DGU).' },
      { label: 'Power backup', value: '100% DG back up.' },
      { label: 'Elevatoring', value: 'Passenger 10 · Parking level 02 · Fire evacuation 01 · Service 01 · Capacity up to 20 pax · High speed up to 7 m/s · Average wait ≤35 secs at peak · Destination control system.' },
      { label: 'Fire safety', value: '2 fire staircases 2.00 m width · Fire tower comprising 1 fire staircase & 1 fire evacuation lift · Water sprinklers, smoke detectors along with fire escapes as per CFO norms.' },
      { label: 'Indoor air quality', value: 'Comfort & Air Quality designed to ASHRAE Standards · optimal indoor climate of 73.4°F at 55% RH across common areas · fresh air delivery 7.5 CFM/person for common areas.' },
      { label: 'Floor plate', value: 'Approx. 10,000 SF large floor plates with efficient vastu compliant layouts — four offices in low and mid rise zones, two in high rise zones.' },
      { label: 'Parking', value: 'Ratio approx. 1:590 & EV charging facility.' },
      { label: 'Building security', value: '3 tier security system.' },
    ],
  },
  {
    id: 'green',
    kind: 'list',
    eyebrow: 'Sustainability',
    headline: ['GREEN BUILDING FEATURES'],
    stat: { label: 'Certification', value: 'IGBC Platinum (Proposed)' },
    items: [
      'efficient lighting system design and fixtures to reduce total energy demand',
      'high performance glass to reduce internal heat gain through glazing',
      'well day-lit habitats to enhance the indoor environment',
      'low VOC material to reduce adverse health impacts for occupants',
      'rainwater harvesting to reduce municipal water demand and maintain the groundwater table',
      'water efficient fixtures and flushing systems',
      'waste water treatment plant with reuse for landscaping and flushing',
      'native species landscaping to reduce water demand and maintain biodiversity',
      'centralised garbage disposal and waste management',
      'electric charging provision to encourage non-fossil-fuel vehicles',
      'energy efficient HVAC to optimise consumption',
    ],
  },
  {
    id: 'partners',
    kind: 'partners',
    eyebrow: 'Partners',
    headline: ['OUR PARTNERS.', 'A CUT ABOVE THE REST.'],
    body:
      'To craft a tower of this calibre, we have brought together consultants of ' +
      'exceptional standing across every discipline.',
    rows: [
      { name: 'Anupam De & Associates', role: 'Design Architect', credentials: ['One World Centre, Lower Parel', 'Blu Estate & Club, Worli'] },
      { name: 'B.N. Shah & Associates (CY Corp)', role: 'Architect', credentials: ['TMGL Skye, Dadar', 'Purohit, Mahalakshmi'] },
      { name: 'MEP Consultants Pvt. Ltd.', role: 'MEP Consultant', credentials: ['British Gas, Mumbai', 'International Finance Centre for TCGRE, Mumbai'] },
      { name: 'Avante Facades', role: 'Façade Consultant', credentials: ['Allianz Tower, Istanbul', 'Godrej GCR, Gurgaon'] },
      { name: 'STS Consultants LLP', role: 'Structural Consultant', credentials: ['Poonawala SEZ Biotech Park, Pune', 'Rustomjee Panorama, Juhu'] },
      { name: 'Roots Designs', role: 'Landscape Architect', credentials: ['Barclays, Pune', 'Infosys, Bhubaneshwar'] },
      { name: 'Kaizen Design Solutions Pvt. Ltd.', role: 'Green Consultant', credentials: ['20 Opera – Nussar House, Mumbai', 'Kalpataru Paramount, Thane'] },
    ],
  },
  {
    id: 'developer',
    kind: 'stats',
    eyebrow: 'The Developer',
    headline: ['PRESCON.', 'BEYOND THE ORDINARY.'],
    body:
      'Prescon has built its reputation on a more thoughtful way of creating places of ' +
      'value. Across asset classes and geographies, our work is marked by design, ' +
      'reliability and a clear sense of distinction.',
    stats: [
      { id: 'legacy', to: 4, prefix: 'Legacy spanning over ', suffix: ' decades' },
      { id: 'projects', to: 21, prefix: '', suffix: ' projects completed' },
      { id: 'families', to: 3000, prefix: 'Trusted by over ', suffix: ' families' },
      { id: 'area', to: 5.1, decimals: 1, prefix: '', suffix: ' million sq. ft. saleable area' },
    ],
    works: [
      { label: 'Waterfront development', value: 'Prescon Midtown Bay, Mahim, Mumbai' },
      { label: 'Landmark Township', value: 'including Prescon Amanha, Goa' },
    ],
  },
];

export const getContent = (id) => CONTENT[id] ?? null;
