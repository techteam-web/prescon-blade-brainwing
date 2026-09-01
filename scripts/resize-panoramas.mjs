// Resize the drone panorama stills in .cache/panos-source/ down to a web-safe
// equirectangular JPEG in public/assets/panoramas/.
//
//   node scripts/resize-panoramas.mjs [--force]
//
// The source stills are 14400×7200 (80-90MB each) — well past what a WebGL texture can
// hold on most GPUs (texture-size limits commonly top out at 4096-16384px, and 14400²
// would need ~300MB of GPU memory per texture regardless). 4096×2048 is the widest size
// that is safe on every device the Panorama viewer (src/features/views/Panorama.jsx)
// needs to run on, single-texture, no tiling.
//
// The source stills live in .cache/ (gitignored), not public/assets/ — same reason the
// render pipeline keeps its 127MB source folder out of the repo (see the note in
// .gitignore): only the processed output is small enough to commit. Drop replacement or
// additional drone stills into .cache/panos-source/ before re-running this.
//
// Filenames are matched by the floor number embedded in each source name, then mapped
// to the fixed output names src/data/floorPanoramas.js already points at — re-run this
// whenever a source still is replaced or a new floor is delivered.

import { mkdir, stat, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, '.cache/panos-source');
const OUT_DIR = join(ROOT, 'public/assets/panoramas');
const FORCE = process.argv.includes('--force');

const WIDTH = 4096;
const HEIGHT = 2048;
const QUALITY = 82;

const JOBS = [
  ['DJI_0001_18th Floor_69.8M.jpg', 'floor-18.jpg'],
  ['DJI_0002_20th Floor 78.2M.jpg', 'floor-20.jpg'],
  ['DJI_0003_25th Floor_99.2M.jpg', 'floor-25.jpg'],
  ['DJI_0004_27th Floor_107.6M.jpg', 'floor-27.jpg'],
  ['DJI_0005_29th Floor_114.8M.jpg', 'floor-29.jpg'],
  ['DJI_0006_32nd Floor_127.4M.jpg', 'floor-32.jpg'],
  ['DJI_0007_34th Floor_135.8M.jpg', 'floor-34.jpg'],
  ['DJI_0008_35th Floor_140M.jpg', 'floor-35.jpg'],
  ['DJI_0009_40th Floor_161M.jpg', 'floor-40.jpg'],
  // No floor number in the source name — shot at 180M, above every plated floor, so it
  // stands in for the crown.
  ['DJI_0010_180M.jpg', 'floor-crown.jpg'],
];

const exists = (p) => access(p).then(() => true, () => false);

async function isStale(src, dest) {
  if (FORCE) return true;
  if (!(await exists(dest))) return true;
  const [a, b] = await Promise.all([stat(src), stat(dest)]);
  return a.mtimeMs > b.mtimeMs;
}

async function main() {
  if (!(await exists(SOURCE_DIR))) {
    console.error(`\n  Source folder not found:\n    ${SOURCE_DIR}\n`);
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  for (const [srcName, outName] of JOBS) {
    const srcPath = join(SOURCE_DIR, srcName);
    const outPath = join(OUT_DIR, outName);
    if (!(await exists(srcPath))) {
      console.warn(`  ! missing source: ${srcName}`);
      continue;
    }
    if (!(await isStale(srcPath, outPath))) {
      console.log(`  = ${outName} (up to date)`);
      continue;
    }
    await sharp(srcPath, { limitInputPixels: false })
      .resize(WIDTH, HEIGHT, { fit: 'fill' })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toFile(outPath);
    const { size } = await stat(outPath);
    console.log(`  → ${outName}  (${(size / 1024 / 1024).toFixed(2)}MB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
