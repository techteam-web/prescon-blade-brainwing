// Confirmed project coordinates: Prescon Worli, Ganapatrao Kadam Marg, Worli Naka,
// BDD Chawls Worli, Mumbai 400013.
export const PROJECT = {
  id: 'blade',
  name: 'The Blade by Prescon',
  lat: 18.9983725,
  lng: 72.8191735,
};

export const INITIAL_VIEW = { center: [PROJECT.lat, PROJECT.lng], zoom: 15 };

export const LANDMARKS = [
  { id: 'worli-naka', name: 'Worli Naka', cat: 'node', lat: 18.9974692, lng: 72.8175748 },
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
];

// 'node' and 'transit' are always shown: they are context, not a filterable category.
export const ALWAYS_ON = new Set(['node', 'transit']);

export const landmarksIn = (cat) => LANDMARKS.filter((l) => l.cat === cat);
