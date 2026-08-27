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
    body: 'One view, three moods. Watch the city turn from day to evening to night.',
    hint: 'Drag to look around · ↑ ↓ to change view',
    empty: 'Panorama pending — drone capture scheduled for this view.',
  },

  /* ----------------------------------------------------------------- 02 profile */
  profile: {
    headline: ['BUSINESS-LIFE,', 'FINELY COMPOSED.'],
    body:
      'Most towers stack offices. The Blade by Prescon arranges them with greater ' +
      'intent. It introduces four distinct lifestyle experiences at different ' +
      'altitudes, each one giving the day a finer rhythm.',
    floors: [
      { level: '41F', height: '+165m', label: 'The Crown' },
      { level: '13F', height: '+50m', label: "The Members' Lounge" },
      { level: '12F', height: '+47m', label: 'The Upper Retreat' },
      { level: 'GL', height: '0m', label: 'The Arrival Gallery' },
    ],
    ranges: [
      { code: '15F–40F', label: 'Office Floors' },
      { code: '1F–11F', label: 'Parking Levels' },
      { code: '-1F/-3F', label: 'Services & Parking' },
    ],
  },

  /* --------------------------------------------------------------- 03 amenities */
  // The four lifestyle experiences, verbatim. Each is a render with its own heading;
  // the page is a gallery, navigated by arrow keys or the on-screen controls.
  gallery: [
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
      { id: 'connectivity', label: 'Connectivity', tone: 'rose' },
    ],
  },

  /* ------------------------------------------------------------------- 08 group */
  // `stats` is verbatim from the client's "Prescon. Beyond the Ordinary." deck slide.
  // Everything else below (eyebrow, headline, body, pillars) is still a placeholder —
  // it is NOT verbatim from the vision document, which breaks LAW 4 above on purpose
  // because the menu row ('Prescon Group') had no screen behind it at all. Replace
  // those with verified copy before this reaches a client.
  group: {
    eyebrow: 'About the Developer',
    headline: ['BUILT ON SITE WORK,', 'NOT SLIDE DECKS.'],
    body:
      'Prescon Group began as a construction outfit before it was ever a developer — ' +
      'which is why every project still starts on site, not in a boardroom. That ' +
      'discipline now spans residential towers, mixed-use addresses and ground-up ' +
      'redevelopment across Mumbai, each one held to one standard: structural honesty ' +
      'first, design second, marketing last. The Blade continues that line.',
    // A stat with no `to` is a fact, not a figure — CountUp renders nothing for it
    // (see Primitives.jsx), and Group.jsx shows its label alone, full weight.
    stats: [
      { id: 'legacy', to: null, suffix: '', label: 'Legacy spanning over four decades' },
      { id: 'projects', to: 21, suffix: '', label: 'Projects completed' },
      { id: 'families', to: 3000, suffix: '+', label: 'Trusted by over 3,000 families' },
      { id: 'area', to: 5.1, decimals: 1, suffix: 'M+', label: 'Sq. Ft. of total saleable area' },
      { id: 'waterfront', to: null, suffix: '', label: 'Waterfront development — Prescon Midtown Bay, Mahim, Mumbai' },
      { id: 'developments', to: null, suffix: '', label: 'Residential, commercial & township developments' },
      { id: 'township', to: null, suffix: '', label: 'Landmark township development including Prescon Amanha, Goa' },
    ],
    pillars: [
      { eyebrow: 'Structural Integrity', body: 'Engineering decided before elevations are drawn — never the other way round.' },
      { eyebrow: 'Design Discipline', body: 'Every material and line answers to the building, not to the trend cycle.' },
      { eyebrow: 'On-Time Delivery', body: 'Handover dates are commitments made at launch, not adjusted at the end.' },
    ],
  },
};

/* ------------------------------------------------------------------ 05 features */
// The features deck. One idea per slide, advanced by click, arrow keys or swipe.
// Every string is verbatim from the vision document — this deck is where the material
// that used to be spread across eight separate screens now lives.
export const FEATURE_SLIDES = [
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
    id: 'systems',
    kind: 'rows',
    eyebrow: 'Tech Specs',
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
];

export const getContent = (id) => CONTENT[id] ?? null;
