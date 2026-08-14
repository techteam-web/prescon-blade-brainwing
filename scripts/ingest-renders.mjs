// Ingest the client's exterior renders into public/assets/renders/ and emit the
// data modules the app reads.
//
//   node scripts/ingest-renders.mjs [--force]
//
// Emits three WebP widths per render plus a 24px blurred LQIP, then writes
// src/data/renders.js. src/data/renderMap.js is written ONLY if absent — it is
// hand-edited after reviewing the console output below and must never be clobbered.

import { mkdir, readdir, writeFile, stat, access } from 'node:fs/promises';
import { join, extname, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Each source gets its own id prefix, so adding a folder can never renumber the ids an
// existing renderMap.js or gallery already points at.
const SOURCE = '/Users/Arsalan/Downloads/WORLI- FINAL EXTERIOR RENDERS';
// Staged by scripts/extract-brand.mjs: the page-1 cover hero, which is not in the
// renders folder. Optional — the ingest runs fine without it.
const STAGED = join(ROOT, '.cache/pdf-renders');

const LINKS = '/Users/Arsalan/Downloads/OneDrive_1_13-08-2026/Links';

// The Links folder is a working directory, not a delivery folder: alongside the finished
// renders it holds cut-out building plates with no background, AI-generated studies, the
// line illustrations used on the Vision slide, and a screenshot. Only the finished
// renders are listed here — an allowlist rather than a filter, so a new working file
// dropped in that folder can never appear in the app by accident.
const LINKS_ALLOW = [
  'Artboard 13.1.png',
  'Artboard 13.2.png',
  'Artboard 13.3.png',
  'Artboard 14 expanded.png',
  'DJI_0556.JPG',
  'Entrance lobby_View 1.jpg.jpeg',
  'artboard 15 expanded.png',
  'artboard 16 expamded.png',
  'artboard 17.png',
  'artboard 4.png',
  'artboard 5 Expanded.png',
  'artboard 6.png',
];
const OUT_DIR = join(ROOT, 'public/assets/renders');
const DATA_DIR = join(ROOT, 'src/data');

const WIDTHS = [1600, 2560, 3840];
const QUALITY = 82;
const LQIP_WIDTH = 24;
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp']);
const DEFAULT_ALT = 'The Blade by Prescon — artistic impression';
const FORCE = process.argv.includes('--force');

const exists = (p) => access(p).then(() => true, () => false);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (EXTS.has(extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

// Emit only if the output is missing or older than the source. The source folder is
// ~127 MB of 8-40 MB JPEGs; re-runs must stay cheap.
async function isStale(src, dest) {
  if (FORCE) return true;
  if (!(await exists(dest))) return true;
  const [a, b] = await Promise.all([stat(src), stat(dest)]);
  return a.mtimeMs > b.mtimeMs;
}

async function main() {
  if (!(await exists(SOURCE))) {
    console.error(`\n  Source folder not found:\n    ${SOURCE}\n`);
    process.exit(1);
  }

  // Sort by basename, not full path: the staged cover hero lives in .cache and would
  // otherwise sort ahead of the source folder and renumber every render, invalidating
  // the hand-edited renderMap.js.
  const byName = (a, b) =>
    basename(a).localeCompare(basename(b), 'en', { numeric: true, sensitivity: 'base' });

  const staged = (await exists(STAGED)) ? await walk(STAGED) : [];
  const exteriors = [...(await walk(SOURCE)), ...staged].sort(byName);

  const linkFiles = (await exists(LINKS))
    ? (await walk(LINKS)).filter((f) => LINKS_ALLOW.includes(basename(f))).sort(byName)
    : [];

  const groups = [
    { prefix: 'render', files: exteriors },
    { prefix: 'blade', files: linkFiles },
  ];
  const files = groups.flatMap((g) => g.files);

  if (!files.length) {
    console.error(`\n  No images found in ${SOURCE}\n`);
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  console.log(`\n  ${exteriors.length} exterior render(s) + ${linkFiles.length} from Links\n`);
  console.log('  Review this mapping, then reorder src/data/renderMap.js to match.\n');

  const records = [];
  const idOf = (file) => {
    for (const g of groups) {
      const i = g.files.indexOf(file);
      if (i !== -1) return `${g.prefix}-${String(i + 1).padStart(2, '0')}`;
    }
    return null;
  };

  for (const file of files) {
    const id = idOf(file);
    const image = sharp(file, { limitInputPixels: false });
    const meta = await image.metadata();

    // Never upscale. If the source is narrower than every target, emit it at native width.
    const targets = WIDTHS.filter((w) => w <= meta.width);
    if (!targets.length) targets.push(meta.width);

    const variants = [];
    for (const w of targets) {
      const name = `${id}-${w}.webp`;
      const dest = join(OUT_DIR, name);
      if (await isStale(file, dest)) {
        await sharp(file, { limitInputPixels: false })
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(dest);
      }
      variants.push({ w, src: `/assets/renders/${name}` });
    }

    const lqipBuf = await sharp(file, { limitInputPixels: false })
      .resize({ width: LQIP_WIDTH })
      .blur(2)
      .webp({ quality: 40 })
      .toBuffer();

    // Prefer the middle width as the plain `src` fallback.
    const fallback = variants.find((v) => v.w === 2560) ?? variants.at(-1);

    records.push({
      id,
      src: fallback.src,
      srcSet: variants.map((v) => `${v.src} ${v.w}w`).join(', '),
      width: meta.width,
      height: meta.height,
      lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
      alt: DEFAULT_ALT,
    });

    console.log(
      `    ${id}  ←  ${basename(file)}` +
        `  (${meta.width}×${meta.height}, ${targets.join('/')})`,
    );
  }

  const rendersFile = `// GENERATED by scripts/ingest-renders.mjs — do not edit by hand.
// Re-run: npm run assets:renders

export const RENDERS = ${JSON.stringify(records, null, 2)};

export const RENDER_BY_ID = Object.fromEntries(RENDERS.map((r) => [r.id, r]));

export const getRender = (id) => (id ? RENDER_BY_ID[id] ?? null : null);
`;
  await writeFile(join(DATA_DIR, 'renders.js'), rendersFile);
  console.log(`\n  → src/data/renders.js (${records.length} records)`);

  await writeRenderMap(records);
  console.log('');
}

// Hand-editable. Written once, then left alone.
async function writeRenderMap(records) {
  const dest = join(DATA_DIR, 'renderMap.js');
  if (await exists(dest)) {
    console.log('  → src/data/renderMap.js already exists — left untouched.');
    return;
  }

  const { SECTIONS } = await import(join(DATA_DIR, 'sections.js'));

  // Sections that carry no render at all: data screens, the map, and the developer
  // screen (its caption is "Actual Image" and no photography has been supplied).
  const NO_RENDER = new Set(['address', 'plans', 'specs', 'enquire', 'prescon']);
  const pool = records.map((r) => r.id);
  let cursor = 0;
  const next = () => (pool.length ? pool[cursor++ % pool.length] : null);

  const slots = [
    ['landing', next()],
    ['menu', next()],
    ...SECTIONS.map((s) => [s.id, NO_RENDER.has(s.id) ? null : next()]),
  ];

  const width = Math.max(...slots.map(([k]) => k.length));
  const body = slots
    .map(([k, v]) => `  ${(k + ':').padEnd(width + 1)} ${v ? `'${v}'` : 'null'},`)
    .join('\n');

  await writeFile(
    dest,
    `// HAND-EDITABLE. Generated once by scripts/ingest-renders.mjs, then never overwritten.
//
// Reorder these after reviewing the id → filename mapping the ingest script prints.
// The defaults below are a naive cycle through the available renders and are almost
// certainly not the art direction you want.
//
// \`null\` means the section has no render: its visual slot stays structurally empty.
// Never substitute placeholder art.

export const RENDER_MAP = {
${body}
};

export const renderIdFor = (key) => RENDER_MAP[key] ?? null;
`,
  );
  console.log(`  → src/data/renderMap.js (created — reorder by hand)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
