// Confirmed project coordinates: Prescon Worli, Ganapatrao Kadam Marg, Worli Naka,
// BDD Chawls Worli, Mumbai 400013.
export const PROJECT = {
  id: 'blade',
  name: 'The Blade by Prescon',
  lat: 18.99837158252392,
  lng: 72.81920075539162,
};

export const INITIAL_VIEW = { center: [PROJECT.lat, PROJECT.lng], zoom: 15 };

export const LANDMARKS = [
  // 'node', emphasis:true landmarks are always shown regardless of filter, and read as a
  // name on the map on their own rather than waiting for hover like every other chip —
  // see the `l.emphasis` check in BladeMap.jsx.
  // labelSide: 'left' — Worli Naka's label reads to the left of its dot instead of the
  // default right, so it doesn't run into the tower marker sitting just east of it.
  {
    id: 'worli-naka',
    name: 'Worli Naka',
    cat: 'node',
    emphasis: true,
    labelSide: 'left',
    lat: 18.998568,
    lng: 72.817382,
  },
  {
    id: 'ganpatrao-kadam-marg',
    name: 'Ganpatrao Kadam Marg',
    cat: 'node',
    emphasis: true,
    lat: 18.998228,
    lng: 72.826674,
  },
  {
    id: 'annie-besant-road',
    name: 'Dr Annie Besant Rd',
    cat: 'node',
    emphasis: true,
    lat: 19.005103,
    lng: 72.817672,
  },
  {
    id: 'mount-mary-basilica',
    name: 'Basilica of Our Lady of the Mount',
    cat: 'node',
    emphasis: true,
    lat: 19.046683,
    lng: 72.822918,
  },
  {
    id: 'bandra-worli-sea-link',
    name: 'Bandra-Worli Sea Link',
    cat: 'node',
    emphasis: true,
    lat: 19.032389,
    lng: 72.81626,
  },
  {
    id: 'siddhivinayak-temple',
    name: 'Siddhivinayak Temple',
    cat: 'node',
    emphasis: true,
    lat: 19.017086,
    lng: 72.830729,
  },
  { id: 'metro', name: 'Acharya Atre Chowk Metro', cat: 'transit', lat: 18.997126, lng: 72.818179 },
  { id: 'palais', name: 'Palais Royale', cat: 'residences', lat: 18.9991667, lng: 72.8204114 },
  { id: 'blu', name: 'Indiabulls Blu', cat: 'residences', lat: 18.9973235, lng: 72.8205492 },
  { id: '360west', name: 'Three Sixty West', cat: 'residences', lat: 19.0110804, lng: 72.8233159 },
  { id: 'fourseasons', name: 'Four Seasons', cat: 'hospitality', lat: 18.993915, lng: 72.8200655 },
  { id: 'stregis', name: 'The St. Regis', cat: 'hospitality', lat: 18.994269, lng: 72.8238429 },
  { id: 'nsci', name: 'NSCI Dome', cat: 'hospitality', lat: 18.9863678, lng: 72.8154765 },
  {
    id: 'racecourse',
    name: 'Mahalaxmi Race Course',
    cat: 'hospitality',
    lat: 18.9842089,
    lng: 72.8200753,
  },
  { id: 'palladium', name: 'Palladium Mall', cat: 'commerce', lat: 18.994459, lng: 72.825031 },
  { id: 'atria', name: 'Atria Mall', cat: 'commerce', lat: 18.9912457, lng: 72.8144358 },
  { id: 'cnergy', name: 'Cnergy IT Park', cat: 'enterprise', lat: 19.0126551, lng: 72.8280996 },
  { id: 'centurion', name: 'Birla Centurion', cat: 'enterprise', lat: 19.0066766, lng: 72.8243989 },
  {
    id: 'peninsula',
    name: 'Peninsula Business Park',
    cat: 'enterprise',
    lat: 18.9987555,
    lng: 72.8292074,
  },
  { id: 'kamala', name: 'Kamala Mills', cat: 'enterprise', lat: 19.004002, lng: 72.827901 },
  { id: 'weh', name: 'Western Express Highway', cat: 'connectivity', lat: 19.002, lng: 72.819 },
  { id: 'aqualine', name: 'Aqua Line', cat: 'connectivity', lat: 19.0087, lng: 72.81941 },
  { id: 'western-railway', name: 'Western Railway', cat: 'connectivity', lat: 19.008085, lng: 72.836527 },

  // -------------------------------------------------------------- roads
  // Surrounding street names, filterable behind their own 'Roads' tab (see
  // content.js) rather than always-on — unlike the arterial roads above that also
  // double as `node` orientation landmarks (e.g. Ganpatrao Kadam Marg, the earlier
  // Dr Annie Besant Rd point), these are shown only on demand, or when a
  // CONNECTIVITY row names one as its `road` (see connectivity.js) and that row is
  // focused — see the `isFocusedRoad` check in BladeMap.jsx.
  //
  // Add a road by hand: an entry here (id, name, cat: 'roads', lat, lng, and a
  // labelDy pixel nudge if it lands on top of another always-on label at the
  // default HOME view), then `road: 'that-id'` on the CONNECTIVITY row it answers.
  { id: 'gm-bhosale-marg', name: 'GM Bhosale Marg', cat: 'roads', lat: 19.001514, lng: 72.81883 },
  { id: 'sir-pochkhanawala-rd', name: 'Sir Pochkhanawala Rd', cat: 'roads', lat:19.007290, lng: 72.815618},
  { id: 'ganapatrao-kadam-marg1', name:'Ganapatrao-kadam Marg', cat: 'roads', lat:18.99847138232131, lng: 72.82048565258353},
  { id: 'dainik-shivner-marg', name: 'Dainik Shivner Marg', cat: 'roads',  lat: 18.99737381443528, lng:  72.82217472372551},
  { id: 'ganapatrao1 ', name: 'Ganapatrao Kadam Marg', cat:'roads', lat: 18.99984636757554, lng:  72.81788930941507},
  { id: 'dr-elijah-moses-rd', name:'Dr Elijah Moses Rd', cat:'roads', lat:18.99652550373858, lng: 72.81848666924125},
  { id: 'khan-abdul', name:' Khan Abdul Gaffar Khan Road', cat:'roads', lat:19.00868197493566,lng: 72.81470503459794},
  { id: 'dr-annie', name: 'Dr Annie Besant Rd', cat:'roads', lat:18.99574803271453, lng: 72.81596332528804},
  { id: 'gm', name: 'GM Bhosale Marg', cat: 'roads', lat:18.999410453985057, lng: 72.81770978454546},


];

// 'node' and 'transit' are always shown: they are context, not a filterable category.
export const ALWAYS_ON = new Set(['node', 'transit']);

export const landmarksIn = (cat) => LANDMARKS.filter((l) => l.cat === cat);
