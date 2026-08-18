import { chromium } from 'playwright';

const outDir = 'C:\\Users\\TechTeam\\AppData\\Local\\Temp\\claude\\c--Users-TechTeam-Downloads-Aniket-prescon-blade-brainwing\\071c6c3b-a0be-400a-b0d1-eb0e23511f1a\\scratchpad';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });

// Fullscreen gate likely blocks the landing screen — click through it if present.
const gateBtn = page.locator('button', { hasText: /enter|fullscreen|continue/i }).first();
try {
  await gateBtn.click({ timeout: 3000 });
} catch {}

await page.waitForTimeout(1000);

const enterBtn = page.locator('[data-enter]');
await enterBtn.waitFor({ state: 'visible', timeout: 15000 });

await page.screenshot({ path: `${outDir}\\enter-before.png` });

const box = await enterBtn.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}\\enter-hover-mid.png` });
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}\\enter-hover-settled.png` });

await page.mouse.move(10, 10);
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}\\enter-after.png` });

console.log('ERRORS:', JSON.stringify(errors));
await browser.close();
