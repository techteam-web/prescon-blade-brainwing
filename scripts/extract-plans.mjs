// Extract the nine floor-plan drawings and the tower elevation from the client's
// vision PDF.
//
//   node scripts/extract-plans.mjs [--force]
//
// The brief specifies PyMuPDF. Neither PyMuPDF (no wheel for the installed Python
// 3.14) nor poppler/pdftoppm is available on this machine, but `mutool` from
// mupdf-tools is — and MuPDF is the exact rasteriser PyMuPDF wraps, so the output is
// pixel-identical. Rendering is mutool, cropping and encoding is sharp, which keeps
// the whole asset pipeline in Node.
//
//   brew install mupdf-tools

import { mkdir, writeFile, rm, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PDF = '/Users/Arsalan/Downloads/PRESCON (VISION DOC) - DIGITAL - PLAN COLOUR CHANGE..pdf';
const PLANS_DIR = join(ROOT, 'public/assets/plans');
const TOWER_DIR = join(ROOT, 'public/assets/tower');
const DATA_DIR = join(ROOT, 'src/data');
const TMP = join(ROOT, '.cache/pdf-pages');
const VERIFY = join(ROOT, '.cache/verify');

// The page is 1920×1080pt, so at -r 72 one point is one pixel. We render at 4× (288 dpi)
// and multiply every rect by SCALE.
const SCALE = 4;
const DPI = 72 * SCALE;

// The ivory panel is Rect(51.89, 169.97, 1868.11, 1032.69) on every plan page. Inside it
// sit three things: the key-elevation strip (top-left), the RERA carpet-area table
// (bottom-left) and the drawing itself. We rebuild the table as live HTML and the key as
// our own component, so both must go.
//
// Measured across all nine plan pages (20-28), every one identical:
//   key-elevation strip   x  127 ->  425
//   RERA table            x  127 ->  875   y  >800   (widest on p20; p27 is narrowest)
//   drawing               x  636 -> 1838   y  234 -> 1002
//
// The key strip clears the drawing horizontally, so a left inset removes it. The table
// does NOT — it sits under the drawing's x-range. But below y=800 there is no drawing
// content at all left of x=1318, so the table is removed by painting that corner ivory.
const PLAN_INNER = { x0: 610, y0: 224, x1: 1848, y1: 1012 };

// Painted over with the panel's own ivory after extraction. Page coordinates.
const TABLE_MASK = { x0: 610, y0: 800, x1: 900, y1: 1012 };

// The annotated tower on the right of page 10. Tighter than the brief's estimate of
// Rect(1280, 70, 1650, 1010): per-column ink density shows the tower body ending at
// x=1544, after which only leader lines and floor badges remain — and those are rebuilt
// as our own component over the image. Vertical extent measured at y 92 -> 1036.
const TOWER_CLIP = { x0: 1318, y0: 84, x1: 1548, y1: 1044 };

const PLAN_WIDTHS = [1400, 2400];
const PLAN_QUALITY = 84;
const FORCE = process.argv.includes('--force');

// PDF page (1-indexed) → asset id, per the brief.
const PAGES = [
  { page: 20, id: 'plan-15' },
  { page: 21, id: 'plan-16-18' },
  { page: 22, id: 'plan-19-26' },
  { page: 23, id: 'plan-20-27' },
  { page: 24, id: 'plan-29' },
  { page: 25, id: 'plan-30-33' },
  { page: 26, id: 'plan-34' },
  { page: 27, id: 'plan-35' },
  { page: 28, id: 'plan-36-40' },
];
const TOWER_PAGE = 10;

const exists = (p) => access(p).then(() => true, () => false);
const px = (r) => ({
  left: Math.round(r.x0 * SCALE),
  top: Math.round(r.y0 * SCALE),
  width: Math.round((r.x1 - r.x0) * SCALE),
  height: Math.round((r.y1 - r.y0) * SCALE),
});

async function ensureMutool() {
  try {
    await run('mutool', ['-v']);
  } catch {
    console.error(
      '\n  `mutool` not found.\n' +
        '  Install it with:  brew install mupdf-tools\n' +
        '  (PyMuPDF and poppler are the documented alternatives; neither is present here.)\n',
    );
    process.exit(1);
  }
}

async function main() {
  if (!(await exists(PDF))) {
    console.error(`\n  Source PDF not found:\n    ${PDF}\n`);
    process.exit(1);
  }
  await ensureMutool();

  console.log('\n  Renderer: mutool (MuPDF) — the same rasteriser PyMuPDF wraps.');
  console.log(`  Rendering pages at ${DPI} dpi (${SCALE}× of 72pt).\n`);

  for (const d of [PLANS_DIR, TOWER_DIR, DATA_DIR, TMP, VERIFY]) {
    await mkdir(d, { recursive: true });
  }

  const pageList = [TOWER_PAGE, ...PAGES.map((p) => p.page)].join(',');
  await run(
    'mutool',
    ['draw', '-r', String(DPI), '-F', 'png', '-o', join(TMP, 'p%d.png'), PDF, pageList],
    { maxBuffer: 1 << 28 },
  );

  // ---- Floor plans -------------------------------------------------------------
  const planRect = px(PLAN_INNER);
  const assets = {};

  // The mask, in crop-local pixels.
  const mask = {
    left: Math.round((TABLE_MASK.x0 - PLAN_INNER.x0) * SCALE),
    top: Math.round((TABLE_MASK.y0 - PLAN_INNER.y0) * SCALE),
    width: Math.round((TABLE_MASK.x1 - TABLE_MASK.x0) * SCALE),
    height: Math.round((TABLE_MASK.y1 - TABLE_MASK.y0) * SCALE),
  };

  for (const { page, id } of PAGES) {
    const source = join(TMP, `p${page}.png`);
    const base = await sharp(source, { limitInputPixels: false }).extract(planRect).toBuffer();

    // Sample the panel's real ivory rather than trusting --color-plan-canvas: the PDF's
    // colour conversion shifts it slightly, and a mask that is off by one reads as a seam.
    const { data: ivory } = await sharp(base)
      .extract({ left: 8, top: 8, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cropped = await sharp(base)
      .composite([
        {
          input: {
            create: {
              width: mask.width,
              height: mask.height,
              channels: 3,
              background: { r: ivory[0], g: ivory[1], b: ivory[2] },
            },
          },
          left: mask.left,
          top: mask.top,
        },
      ])
      .toBuffer();

    const variants = [];
    for (const w of PLAN_WIDTHS) {
      const name = `${id}-${w}.webp`;
      const dest = join(PLANS_DIR, name);
      if (FORCE || !(await exists(dest))) {
        await sharp(cropped)
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: PLAN_QUALITY })
          .toFile(dest);
      }
      variants.push({ w, src: `/assets/plans/${name}` });
    }

    assets[id] = {
      src: variants.at(-1).src,
      srcSet: variants.map((v) => `${v.src} ${v.w}w`).join(', '),
      width: planRect.width,
      height: planRect.height,
    };

    console.log(`    page ${page}  →  ${id}  (${planRect.width}×${planRect.height})`);
  }

  // ---- Tower elevation ---------------------------------------------------------
  // Page 10's tower is a raster render composited on black, not vector art, so there is
  // no transparency to recover directly. But "composited on black" is itself the
  // information: a pixel's brightness IS its coverage. Alpha is the brightest channel and
  // the colour is unpremultiplied back out of it, which reconstructs a true cut-out.
  //
  // The alternative — shipping it on its black backing and hiding that with
  // mix-blend-mode: screen over a matched backplate — only holds while the page ground is
  // also near-black. It broke the moment the ground warmed, as a hard black rectangle.
  const towerRect = px(TOWER_CLIP);
  const towerDest = join(TOWER_DIR, 'tower-elevation.png');
  const { data: towerRaw, info: towerInfo } = await sharp(join(TMP, `p${TOWER_PAGE}.png`), {
    limitInputPixels: false,
  })
    .extract(towerRect)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // The backing is not pure black — it is the page's near-black, and measurably so. Treat
  // brightness as coverage only ABOVE that floor, or the whole backing picks up a few
  // percent of alpha and paints a faint rectangle wherever the page is lighter than the
  // page it was cut from. The floor is read off the image's own border ring rather than
  // hardcoded, so a re-crop or a re-export cannot silently invalidate it.
  const { width: tw, height: th } = towerInfo;
  const maxAt = (x, y) => {
    const i = (y * tw + x) * 3;
    return Math.max(towerRaw[i], towerRaw[i + 1], towerRaw[i + 2]);
  };
  const ring = [];
  for (let x = 0; x < tw; x++) ring.push(maxAt(x, 0), maxAt(x, th - 1));
  for (let y = 0; y < th; y++) ring.push(maxAt(0, y), maxAt(tw - 1, y));
  ring.sort((a, b) => a - b);
  const floor = ring[Math.floor(ring.length * 0.9)]; // 90th pct: ignores any ink touching an edge
  const bg = [0, 1, 2].map((k) => towerRaw[k]); // the corner pixel is the backing colour

  const towerRGBA = Buffer.alloc(tw * th * 4);
  for (let i = 0, j = 0; i < towerRaw.length; i += 3, j += 4) {
    const c = [towerRaw[i], towerRaw[i + 1], towerRaw[i + 2]];
    const a = Math.min(1, Math.max(0, (Math.max(c[0], c[1], c[2]) - floor) / (255 - floor)));
    if (a <= 0) continue; // buffer is already zeroed
    for (let k = 0; k < 3; k++) {
      towerRGBA[j + k] = Math.min(255, Math.max(0, Math.round((c[k] - bg[k] * (1 - a)) / a)));
    }
    towerRGBA[j + 3] = Math.round(a * 255);
  }
  console.log(`    tower alpha: backing ${bg.join(',')} floor ${floor}`);

  await sharp(towerRGBA, { raw: { width: tw, height: th, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(towerDest);

  console.log(
    `\n    page ${TOWER_PAGE}  →  tower-elevation.png  (${towerRect.width}×${towerRect.height})`,
  );

  // ---- Data module -------------------------------------------------------------
  await writeFile(
    join(DATA_DIR, 'planAssets.js'),
    `// GENERATED by scripts/extract-plans.mjs — do not edit by hand.
// Re-run: npm run assets:plans

export const PLAN_ASSETS = ${JSON.stringify(assets, null, 2)};

export const TOWER_ELEVATION = {
  src: '/assets/tower/tower-elevation.png',
  width: ${towerRect.width},
  height: ${towerRect.height},
  // Cut out with a real alpha channel — no blend mode, composites on any ground.
  aspectRatio: ${(towerRect.width / towerRect.height).toFixed(6)},
};

export const getPlan = (id) => (id ? PLAN_ASSETS[id] ?? null : null);
`,
  );
  console.log('\n  → src/data/planAssets.js');

  await contactSheet();

  await rm(TMP, { recursive: true, force: true });
  console.log('');
}

// One montage of all nine crops, so the crop is verified in a single look rather
// than by opening nine files. Adjust PLAN_INNER and re-run if any drawing is clipped.
async function contactSheet() {
  const TW = 460;
  const TH = Math.round((TW * (PLAN_INNER.y1 - PLAN_INNER.y0)) / (PLAN_INNER.x1 - PLAN_INNER.x0));
  const COLS = 3;
  const rows = Math.ceil(PAGES.length / COLS);

  const tiles = await Promise.all(
    PAGES.map(({ id }) =>
      sharp(join(PLANS_DIR, `${id}-1400.webp`)).resize(TW, TH, { fit: 'inside' }).toBuffer(),
    ),
  );

  const dest = join(VERIFY, 'plans-contact.png');
  await sharp({
    create: { width: TW * COLS, height: TH * rows, channels: 3, background: '#0B0807' },
  })
    .composite(
      tiles.map((input, i) => ({
        input,
        left: (i % COLS) * TW,
        top: Math.floor(i / COLS) * TH,
      })),
    )
    .png()
    .toFile(dest);

  console.log(`  → ${dest.replace(ROOT + '/', '')}  (verify the crop here)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
