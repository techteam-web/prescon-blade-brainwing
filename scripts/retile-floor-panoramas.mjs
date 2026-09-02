// Re-tile the ten walked-drone floor panoramas at a sharper cube-face resolution.
//
//   node scripts/retile-floor-panoramas.mjs [--force] [--scene=6-floor-25]
//
// The floor scenes in src/data/data.js were originally tiled at faceSize 1024 —
// noticeably softer than the three dji_*_180m scenes (faceSize 3600) used on the Views
// screen, even though both come from the same class of 14400×7200 equirectangular DJI
// stills, still sitting in .cache/panos-source/. This adds one sharper level (2048,
// tileSize 512 → 4×4 tiles/face) on top of the existing 256/512/1024 levels, generated
// straight from those source stills — no external tiling tool needed.
//
// The per-face projection below is Marzipano's own (node_modules/marzipano/src/
// geometries/Cube.js: faceRotation table, applied to a front-face vertex (u, v, -0.5)),
// reduced to closed form since every rotation is a multiple of 90°. Verified against the
// existing level-1 tiles face-by-face (calibrate.mjs, not checked in) before this ran at
// full resolution — do the same before trusting any change to the face formulas below.

import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, '.cache/panos-source');
const TILES_DIR = join(ROOT, 'public/assets/panoramas/tiles');

const FORCE = process.argv.includes('--force');
const onlyScene = process.argv.find((a) => a.startsWith('--scene='))?.split('=')[1] ?? null;

// scene id (as in data.js) -> source still in .cache/panos-source/
const SCENES = [
  ['0-floor-crown', 'DJI_0010_180M.jpg'],
  ['1-floor-40', 'DJI_0009_40th Floor_161M.jpg'],
  ['2-floor-35', 'DJI_0008_35th Floor_140M.jpg'],
  ['3-floor-34', 'DJI_0007_34th Floor_135.8M.jpg'],
  ['4-floor-27', 'DJI_0004_27th Floor_107.6M.jpg'],
  ['5-floor-29', 'DJI_0005_29th Floor_114.8M.jpg'],
  ['6-floor-25', 'DJI_0003_25th Floor_99.2M.jpg'],
  ['7-floor-32', 'DJI_0006_32nd Floor_127.4M.jpg'],
  ['8-floor-20', 'DJI_0002_20th Floor 78.2M.jpg'],
  ['9-floor-18', 'DJI_0001_18th Floor_69.8M.jpg'],
];

const FACES = ['f', 'b', 'l', 'r', 'u', 'd'];
const TILE_SIZE = 512;
const JPEG_QUALITY = 86;
// Mirrors the existing dji_*_180m drone scenes' own ladder exactly (see data.js) — level
// 3 at 2048 (4×4 tiles/face), level 4 at 4096 (8×8 tiles/face), on top of the floor
// scenes' existing 0 (fallback)/1 (512)/2 (1024).
const NEW_LEVELS = [
  { index: 3, size: 2048 },
  { index: 4, size: 4096 },
];

// Closed-form face-local (u, v, -0.5) -> world direction, one branch per face — see the
// derivation note above. u, v each span [-0.5, 0.5]; v is +up (row 0 of a tile is the
// face's top edge, matching CubeTile.centerY in Cube.js).
const FACE_DIR = {
  f: (u, v) => [u, v, -0.5],
  b: (u, v) => [-u, v, 0.5],
  l: (u, v) => [-0.5, v, -u],
  r: (u, v) => [0.5, v, u],
  u: (u, v) => [u, 0.5, v],
  d: (u, v) => [u, -0.5, -v],
};

async function loadSource(path) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function makeSampler(src) {
  const { data, width, height, channels } = src;
  return (x, y) => {
    x = ((x % width) + width) % width;
    y = y < 0 ? 0 : y > height - 1 ? height - 1 : y;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = (x0 + 1) % width, y1 = y0 + 1 > height - 1 ? height - 1 : y0 + 1;
    const fx = x - x0, fy = y - y0;
    const i00 = (y0 * width + x0) * channels;
    const i10 = (y0 * width + x1) * channels;
    const i01 = (y1 * width + x0) * channels;
    const i11 = (y1 * width + x1) * channels;
    const out = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const top = data[i00 + c] * (1 - fx) + data[i10 + c] * fx;
      const bot = data[i01 + c] * (1 - fx) + data[i11 + c] * fx;
      out[c] = top * (1 - fy) + bot * fy;
    }
    return out;
  };
}

async function renderFace(sample, srcW, srcH, face, sceneDir, levelSize, levelIndex) {
  const dir = FACE_DIR[face];
  const faceBuf = new Uint8ClampedArray(levelSize * levelSize * 3);

  for (let py = 0; py < levelSize; py++) {
    const v = 0.5 - (py + 0.5) / levelSize;
    for (let px = 0; px < levelSize; px++) {
      const u = (px + 0.5) / levelSize - 0.5;
      const [x, y, z] = dir(u, v);
      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len, ny = y / len, nz = z / len;
      const lon = Math.atan2(nx, -nz);
      const lat = Math.asin(ny);
      const sx = (lon / (2 * Math.PI) + 0.5) * srcW;
      const sy = (0.5 - lat / Math.PI) * srcH;
      const [r, g, b] = sample(sx, sy);
      const idx = (py * levelSize + px) * 3;
      faceBuf[idx] = r;
      faceBuf[idx + 1] = g;
      faceBuf[idx + 2] = b;
    }
  }

  const tilesPerSide = levelSize / TILE_SIZE;
  for (let ty = 0; ty < tilesPerSide; ty++) {
    for (let tx = 0; tx < tilesPerSide; tx++) {
      const dest = join(sceneDir, String(levelIndex), face, String(ty));
      await mkdir(dest, { recursive: true });
      await sharp(faceBuf, { raw: { width: levelSize, height: levelSize, channels: 3 } })
        .extract({ left: tx * TILE_SIZE, top: ty * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE })
        .jpeg({ quality: JPEG_QUALITY, progressive: true })
        .toFile(join(dest, `${tx}.jpg`));
    }
  }
}

async function main() {
  const scenes = onlyScene ? SCENES.filter(([id]) => id === onlyScene) : SCENES;
  if (!scenes.length) {
    console.error(`No scene matches --scene=${onlyScene}`);
    process.exit(1);
  }

  const topLevel = NEW_LEVELS.at(-1);

  for (const [sceneId, filename] of scenes) {
    const sceneDir = join(TILES_DIR, sceneId);
    const tilesPerSide = topLevel.size / TILE_SIZE;
    const markerFace = join(sceneDir, String(topLevel.index), 'd', String(tilesPerSide - 1), `${tilesPerSide - 1}.jpg`);
    if (!FORCE) {
      const { access } = await import('node:fs/promises');
      const exists = await access(markerFace).then(() => true, () => false);
      if (exists) {
        console.log(`  skip ${sceneId} (level ${topLevel.index} already present)`);
        continue;
      }
    }

    const t0 = Date.now();
    console.log(`  ${sceneId} <- ${filename}`);
    const src = await loadSource(join(SOURCE_DIR, filename));
    const sample = makeSampler(src);

    for (const { index, size } of NEW_LEVELS) {
      for (const face of FACES) {
        await renderFace(sample, src.width, src.height, face, sceneDir, size, index);
        console.log(`    level ${index} face ${face} done (${((Date.now() - t0) / 1000).toFixed(1)}s elapsed)`);
      }
    }

    console.log(`  ${sceneId} finished in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  console.log('\n  Tiles written. Now bump the matching scenes in src/data/data.js:');
  for (const { size } of NEW_LEVELS) {
    console.log(`    - add { "tileSize": 512, "size": ${size} } to "levels"`);
  }
  console.log('    - raise "faceSize" to 3600');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
