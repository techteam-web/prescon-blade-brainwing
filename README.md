# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deploying to Vercel

1. Commit everything, **including `src/data/corridors.js`** — it is generated but it is
   committed, and the build fails without it.
2. `git push` to `main`.
3. Vercel → **Add New… → Project** → import the repo. The defaults are correct; if you
   are checking them by hand they should read:

   | Setting          | Value           |
   | ---------------- | --------------- |
   | Framework Preset | `Vite`          |
   | Build Command    | `npm run build` |
   | Output Directory | `dist`          |
   | Install Command  | `npm install`   |
   | Node.js Version  | `22.x` or later |

4. Deploy. Nothing else is required for the map — it needs no key (see below).

If the deployed site still shows no map, it is one of three things, in order of
likelihood: the deployment is older than the map code (check **Deployments** → the commit
SHA on the live one); the build failed and Vercel is still serving the last good deploy
(check **Deployments → Build Logs**); or the browser is blocking the tile requests (open
the console on the deployed URL — the app logs every map failure as `[map] …`).

## The Location map

The map needs no key and no configuration. It draws OpenMapTiles vector tiles from
[OpenFreeMap](https://openfreemap.org)'s free, keyless planet endpoint, and road routing
comes from the public OSRM demo server. Both are plain HTTPS requests from the browser,
so a static deploy — Vercel included — serves a working map with nothing set up.

`vercel.json` already rewrites every extensionless path to `index.html`, so `/location`
is a valid deep link on the deployed site.

### Optional: MapTiler tiles

If you want MapTiler's tiles instead (higher rate limits, an SLA, and their CDN), set one
environment variable:

1. Vercel → your project → **Settings → Environment Variables**
2. Add `VITE_MAPTILER_KEY` = your key, ticked for Production, Preview and Development
3. **Redeploy.** Vite inlines `import.meta.env.*` at BUILD time, so an existing deployment
   will not pick the key up — it has to be rebuilt.

Locally, copy `.env.example` to `.env` and fill the same variable. With the key absent
everything falls through to OpenFreeMap, which is a perfectly good production fallback.

`src/features/map/mapStyle.js` is written against the OpenMapTiles schema, so every layer
is identical under either provider.
