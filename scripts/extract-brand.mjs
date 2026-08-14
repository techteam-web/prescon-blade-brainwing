// Extract the two brand marks from the vision PDF as real vector.
//
//   node scripts/extract-brand.mjs [--dump]
//
// `mutool draw -F svg` emits the page as vector: outlined artwork becomes <path>, and
// live text becomes <use> references to glyph outlines held in <defs>. Both carry a
// placement matrix, so with accumulated group transforms we can compute each element's
// page-space bounding box and keep only what falls inside a named region.
//
// Output is a standalone, tightly-cropped SVG per mark, written to src/assets/brand/.
// Those are inlined by Wordmark.jsx and PresconLogo.jsx — inline is required because
// the intro sequence animates the wordmark's paths.
//
// --dump prints every element it finds with its bbox, which is how you re-derive a
// REGION rect if the source document changes.

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PDF = '/Users/Arsalan/Downloads/PRESCON (VISION DOC) - DIGITAL - PLAN COLOUR CHANGE..pdf';
const TMP = join(ROOT, '.cache/brand');
const OUT = join(ROOT, 'src/assets/brand');
const DUMP = process.argv.includes('--dump');

// Page-space rectangles, measured on the 1920×1080pt page 1 (the cover, which is also
// the Landing composition). Re-derive with --dump if the source document changes.
// The Prescon lockup is NOT extracted as vector.
//
// Its two larger peaks are gradient-filled, and MuPDF exports a shaded fill as a masked
// raster rather than a path — so a path-only extraction silently drops them and leaves
// the mark as one solid peak plus two thin edge slivers. That is wrong, and it is the
// client's registered corporate mark, so wrong is not an option.
//
// Instead it is rasterised at high resolution from a page where it sits on flat black,
// and alpha is derived from luminance. That is exact for this mark because it is purely
// light on black: alpha = max(r,g,b), colour = source unpremultiplied. No keying
// tolerance, no fringing, and the gradients survive. The lockup never animates and never
// recolours, so a raster costs nothing.
const LOGO_RASTER = { page: 20, x0: 1770, y0: 47, x1: 1872, y1: 118, scale: 5 };

const REGIONS = [
  // x1 stops short of 660: the vertical hairline and the "Worli Naka" map pin begin at
  // x≈670 and are lockup siblings, not part of the mark. The wordmark IS flat cream, so
  // it extracts cleanly as vector — which the intro needs, since it animates its paths.
  { name: 'wordmark', page: 1, x0: 258, y0: 570, x1: 655, y1: 715 },
];

/* ------------------------------------------------------------------ matrices */

const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const IDENT = [1, 0, 0, 1, 0, 0];

function parseTransform(str) {
  if (!str) return IDENT;
  let m = IDENT;
  const re = /(matrix|translate|scale)\s*\(([^)]*)\)/g;
  let hit;
  while ((hit = re.exec(str))) {
    const v = hit[2].split(/[\s,]+/).filter(Boolean).map(Number);
    if (hit[1] === 'matrix') m = mul(m, v);
    else if (hit[1] === 'translate') m = mul(m, [1, 0, 0, 1, v[0] || 0, v[1] || 0]);
    else m = mul(m, [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0]);
  }
  return m;
}

/* --------------------------------------------------------------- path bbox */

// Walks path data tracking the current point so relative commands resolve correctly.
// Control points are included in the bounds, which overestimates curves slightly — that
// is exactly what we want for a containment filter.
function pathPoints(d) {
  const pts = [];
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  let i = 0,
    cx = 0,
    cy = 0,
    sx = 0,
    sy = 0,
    cmd = 'M';
  const num = () => parseFloat(tokens[i++]);
  const push = (x, y) => pts.push([x, y]);

  while (i < tokens.length) {
    if (/[MmLlHhVvCcSsQqTtAaZz]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') {
      cx = sx;
      cy = sy;
      continue;
    }
    if (C === 'M' || C === 'L' || C === 'T') {
      const x = num(),
        y = num();
      cx = rel ? cx + x : x;
      cy = rel ? cy + y : y;
      if (C === 'M') {
        sx = cx;
        sy = cy;
        cmd = rel ? 'l' : 'L'; // implicit lineto for subsequent pairs
      }
      push(cx, cy);
    } else if (C === 'H') {
      const x = num();
      cx = rel ? cx + x : x;
      push(cx, cy);
    } else if (C === 'V') {
      const y = num();
      cy = rel ? cy + y : y;
      push(cx, cy);
    } else if (C === 'C' || C === 'S' || C === 'Q') {
      const n = C === 'C' ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const x = num(),
          y = num();
        const ax = rel ? cx + x : x,
          ay = rel ? cy + y : y;
        push(ax, ay);
        if (k === n - 1) {
          cx = ax;
          cy = ay;
        }
      }
    } else if (C === 'A') {
      num();
      num();
      num();
      num();
      num();
      const x = num(),
        y = num();
      cx = rel ? cx + x : x;
      cy = rel ? cy + y : y;
      push(cx, cy);
    } else {
      i++; // unknown token; skip
    }
  }
  return pts;
}

const bboxOf = (pts) =>
  pts.length
    ? pts.reduce(
        (b, [x, y]) => ({
          x0: Math.min(b.x0, x),
          y0: Math.min(b.y0, y),
          x1: Math.max(b.x1, x),
          y1: Math.max(b.y1, y),
        }),
        { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
      )
    : null;

/* ------------------------------------------------------------- svg walking */

// Collects renderable leaves with their accumulated transform. Anything inside <defs>
// is a resource, not a drawing, so it is indexed rather than emitted.
function collect(svg) {
  const glyphs = new Map(); // id -> path d (em space, y-up)
  for (const m of svg.matchAll(/<path\s+id="(font_[^"]+)"\s+d="([^"]*)"/g)) {
    glyphs.set(m[1], m[2]);
  }

  const body = svg.slice(svg.indexOf('</defs>') + 7);
  const leaves = [];
  const stack = [IDENT];
  const tagRe = /<(\/?)(g|path|use|image|rect)\b([^>]*?)(\/?)>/g;
  let t;

  while ((t = tagRe.exec(body))) {
    const [, closing, tag, attrs, selfClose] = t;
    if (closing) {
      if (tag === 'g') stack.pop();
      continue;
    }
    const tf = parseTransform(/transform="([^"]*)"/.exec(attrs)?.[1]);
    const here = mul(stack.at(-1), tf);

    if (tag === 'g') {
      if (!selfClose) stack.push(here);
      continue;
    }
    if (tag !== 'path' && tag !== 'use') continue;

    const fill = /fill="([^"]*)"/.exec(attrs)?.[1] ?? null;
    if (fill === 'none') continue;

    let d = null;
    let m = here;
    if (tag === 'path') {
      d = /\sd="([^"]*)"/.exec(attrs)?.[1] ?? null;
    } else {
      const ref = /xlink:href="#([^"]+)"/.exec(attrs)?.[1];
      d = ref ? glyphs.get(ref) : null;
      if (!d) continue;
    }
    if (!d) continue;

    const pts = pathPoints(d).map(([x, y]) => apply(m, x, y));
    const bb = bboxOf(pts);
    if (!bb || !isFinite(bb.x0)) continue;

    leaves.push({ d, m, fill, bb, text: /data-text="([^"]*)"/.exec(attrs)?.[1] ?? null });
  }
  return leaves;
}

const inside = (bb, r) => bb.x0 >= r.x0 && bb.x1 <= r.x1 && bb.y0 >= r.y0 && bb.y1 <= r.y1;

/* -------------------------------------------------------------------- main */

async function main() {
  await mkdir(TMP, { recursive: true });
  await mkdir(OUT, { recursive: true });

  const pages = [...new Set(REGIONS.map((r) => r.page))];
  await run(
    'mutool',
    ['draw', '-F', 'svg', '-o', join(TMP, 'p%d.svg'), PDF, pages.join(',')],
    { maxBuffer: 1 << 28 },
  );

  console.log('');
  const cache = new Map();

  for (const region of REGIONS) {
    if (!cache.has(region.page)) {
      const raw = await readFile(join(TMP, `p${region.page}.svg`), 'utf8');
      // Base64 rasters are megabytes and never part of a mark.
      cache.set(region.page, collect(raw.replace(/xlink:href="data:image\/[^"]+"/g, '')));
    }
    const leaves = cache.get(region.page);

    if (DUMP) {
      console.log(`  --dump  page ${region.page}, elements near "${region.name}":`);
      for (const l of leaves) {
        if (l.bb.x1 < region.x0 - 120 || l.bb.x0 > region.x1 + 120) continue;
        if (l.bb.y1 < region.y0 - 120 || l.bb.y0 > region.y1 + 120) continue;
        console.log(
          `    (${l.bb.x0.toFixed(1)},${l.bb.y0.toFixed(1)})-(${l.bb.x1.toFixed(1)},${l.bb.y1.toFixed(1)})` +
            `  fill=${l.fill ?? '-'}${l.text ? `  text=${JSON.stringify(l.text)}` : ''}`,
        );
      }
    }

    const hits = leaves.filter((l) => inside(l.bb, region));
    if (!hits.length) {
      console.log(`  ${region.name}: NOTHING FOUND in the region — re-run with --dump.`);
      continue;
    }

    const bb = hits.reduce(
      (a, l) => ({
        x0: Math.min(a.x0, l.bb.x0),
        y0: Math.min(a.y0, l.bb.y0),
        x1: Math.max(a.x1, l.bb.x1),
        y1: Math.max(a.y1, l.bb.y1),
      }),
      { ...hits[0].bb },
    );

    const pad = 0.5;
    const vb = {
      x: bb.x0 - pad,
      y: bb.y0 - pad,
      w: bb.x1 - bb.x0 + pad * 2,
      h: bb.y1 - bb.y0 + pad * 2,
    };

    const round = (n) => +n.toFixed(3);
    const paths = hits
      .map((l) => {
        const mt = l.m.map(round).join(',');
        // currentColor lets one component recolour the mark; the Prescon lockup keeps
        // its own golds, which are LOGO ONLY and never a UI accent.
        const fill = l.fill && l.fill.toLowerCase() !== '#ffffff' ? l.fill : 'currentColor';
        return `  <path transform="matrix(${mt})" fill="${fill}" d="${l.d}"/>`;
      })
      .join('\n');

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" ` +
      `viewBox="${round(vb.x)} ${round(vb.y)} ${round(vb.w)} ${round(vb.h)}" ` +
      `fill="currentColor">\n${paths}\n</svg>\n`;

    const dest = join(OUT, `${region.name}.svg`);
    await writeFile(dest, svg);
    console.log(
      `  ${region.name}: ${hits.length} path(s), ` +
        `viewBox ${round(vb.w)}×${round(vb.h)} → src/assets/brand/${region.name}.svg`,
    );
  }

  await rasterisePresconLogo();
  await extractCoverHero();
  console.log('');
}

// See LOGO_RASTER above for why the lockup is a raster and not vector.
async function rasterisePresconLogo() {
  const sharp = (await import('sharp')).default;
  const { page, x0, y0, x1, y1, scale } = LOGO_RASTER;
  const tmp = join(TMP, `logo-p${page}.png`);

  await run(
    'mutool',
    ['draw', '-r', String(72 * scale), '-F', 'png', '-o', tmp, PDF, String(page)],
    { maxBuffer: 1 << 28 },
  );

  const { data, info } = await sharp(tmp)
    .extract({
      left: Math.round(x0 * scale),
      top: Math.round(y0 * scale),
      width: Math.round((x1 - x0) * scale),
      height: Math.round((y1 - y0) * scale),
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // alpha = luminance; colour = source / alpha. Exact for light-on-black artwork.
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = Math.max(r, g, b);
    if (a === 0) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      continue;
    }
    const k = 255 / a;
    out[i] = Math.min(255, Math.round(r * k));
    out[i + 1] = Math.min(255, Math.round(g * k));
    out[i + 2] = Math.min(255, Math.round(b * k));
    out[i + 3] = a;
  }

  const dest = join(OUT, 'prescon-logo.png');
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize({ width: 640 })
    .png({ compressionLevel: 9 })
    .toFile(dest);

  console.log(`  prescon-logo: ${info.width}×${info.height} raster, alpha from luminance → src/assets/brand/prescon-logo.png`);
}

// Page 1 is the client's own Landing composition, and its hero is a render that does
// not appear in the exterior-renders folder. We stage the exact crop the page uses so
// ingest-renders.mjs picks it up as a normal render and the Landing screen can match
// the source document.
async function extractCoverHero() {
  const sharp = (await import('sharp')).default;
  const raw = await readFile(join(TMP, 'p1.svg'), 'utf8');

  // Two rasters share the page: a luminance mask and the photograph. Take the larger
  // payload — the mask is a fraction of the size, and we apply our own scrim anyway.
  const images = [
    ...raw.matchAll(
      /<image id="([^"]+)" width="(\d+)" height="(\d+)" xlink:href="data:image\/(jpeg|png);base64,([^"]+)"/g,
    ),
  ].map((m) => ({ id: m[1], w: +m[2], h: +m[3], b64: m[5] }));
  if (!images.length) return console.log('  cover hero: no embedded raster on page 1.');

  const hero = images.sort((a, b) => b.b64.length - a.b64.length)[0];

  // Placement matrix of the group wrapping the image, so we reproduce the page's crop
  // rather than the whole plate.
  const gm = /<g transform="matrix\(([^)]*)\)">\s*<image id="image_/.exec(raw);
  const [a, , , d, e, f] = gm ? gm[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0];
  const PAGE_W = 1920;
  const PAGE_H = 1080;
  const left = Math.max(0, Math.round(-e / a));
  const top = Math.max(0, Math.round(-f / d));
  const width = Math.min(hero.w - left, Math.round(PAGE_W / a));
  const height = Math.min(hero.h - top, Math.round(PAGE_H / d));

  const stageDir = join(ROOT, '.cache/pdf-renders');
  await mkdir(stageDir, { recursive: true });
  // Sorts last in the ingest, so it never renumbers the folder's renders.
  const dest = join(stageDir, 'Render-99 (cover hero).jpg');

  await sharp(Buffer.from(hero.b64, 'base64'), { limitInputPixels: false })
    .extract({ left, top, width, height })
    .jpeg({ quality: 95 })
    .toFile(dest);

  console.log(
    `  cover hero: page-1 crop ${width}×${height} → .cache/pdf-renders/ ` +
      `(picked up by npm run assets:renders)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
