// Plan drawings supplied directly as flat, single-resolution WEBPs with a real alpha
// channel — everything outside the drawn floor plate is transparent, not painted ivory,
// so the plan sits straight on the dark card with no white backing box. There is no
// responsive srcSet since each floor ships as one file.
//
// Filenames are plain ASCII with spaces only — no `&` or `,`. Both broke Vite's dev
// static-file routing even correctly percent-encoded (%26 / %2C): the request silently
// fell through to the SPA's index.html instead of the file, so the <img> got HTML back
// with no network error, just naturalWidth 0. Renamed at the source rather than worked
// around, since an unknown production host might mishandle the same characters too.
const PLAN_FILES = {
  'plan-15': { name: '15TH FLOOR.webp', width: 4981, height: 3328 },
  'plan-16-18': { name: '16TH 17TH AND 18TH FLOOR.webp', width: 4981, height: 3328 },
  'plan-19-26': { name: '19TH AND 21ST TO 26TH FLOOR.webp', width: 4981, height: 3328 },
  'plan-20-27': { name: '20TH AND 27TH FLOOR.webp', width: 5059, height: 3367 },
  'plan-29': { name: '29TH FLOOR.webp', width: 5118, height: 3367 },
  'plan-30-33': { name: '30TH TO 33RD FLOOR.webp', width: 5098, height: 3367 },
  'plan-34': { name: '34TH FLOOR.webp', width: 5040, height: 3367 },
  'plan-35': { name: '35TH FLOOR.webp', width: 5040, height: 3329 },
  'plan-36-40': { name: '36TH TO 40TH FLOOR.webp', width: 5078, height: 3329 },
};

export const PLAN_ASSETS = Object.fromEntries(
  Object.entries(PLAN_FILES).map(([id, { name, width, height }]) => {
    const src = `/assets/plans/${encodeURIComponent(name)}`;
    return [id, { src, srcSet: `${src} ${width}w`, width, height }];
  }),
);

export const TOWER_ELEVATION = {
  src: '/assets/tower/tower-elevation.png',
  width: 920,
  height: 3840,
  // Cut out with a real alpha channel — no blend mode, composites on any ground.
  aspectRatio: 0.239583,
};

export const getPlan = (id) => (id ? PLAN_ASSETS[id] ?? null : null);
