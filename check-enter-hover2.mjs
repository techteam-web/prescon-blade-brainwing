import { chromium } from 'playwright';

const outDir = 'C:\\Users\\TechTeam\\AppData\\Local\\Temp\\claude\\c--Users-TechTeam-Downloads-Aniket-prescon-blade-brainwing\\071c6c3b-a0be-400a-b0d1-eb0e23511f1a\\scratchpad';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));

await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
try {
  await page.locator('button', { hasText: /enter|fullscreen|continue/i }).first().click({ timeout: 3000 });
} catch {}
await page.waitForTimeout(1000);

const enterBtn = page.locator('[data-enter]');
await enterBtn.waitFor({ state: 'visible', timeout: 15000 });
const box = await enterBtn.boundingBox();
const clip = { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: box.width + 40, height: box.height + 40 };

await page.screenshot({ path: `${outDir}\\btn-rest.png`, clip });

const style = await enterBtn.evaluate((el) => window.getComputedStyle(el).pointerEvents);
console.log('POINTER-EVENTS', style, 'BOX', JSON.stringify(box));
await enterBtn.hover();
await page.waitForTimeout(50);
await page.screenshot({ path: `${outDir}\\btn-t050.png`, clip });
await page.waitForTimeout(150);
await page.screenshot({ path: `${outDir}\\btn-t200.png`, clip });
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}\\btn-t500.png`, clip });
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}\\btn-t1000.png`, clip });

await page.mouse.move(10, 10);
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}\\btn-leave.png`, clip });

await browser.close();
