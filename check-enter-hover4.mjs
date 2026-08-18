import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));

await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
try {
  await page.locator('button', { hasText: /enter|fullscreen|continue/i }).first().click({ timeout: 3000 });
} catch {}
await page.waitForTimeout(1000);

const enterBtn = page.locator('[data-enter]');
await enterBtn.waitFor({ state: 'visible', timeout: 15000 });

await enterBtn.hover();
await page.waitForTimeout(600);

const info = await page.evaluate(() => {
  const fill = document.querySelector('[data-portal-fill]');
  const label = document.querySelector('[data-control-label]');
  return {
    fillTransform: fill ? getComputedStyle(fill).transform : null,
    labelColor: label ? getComputedStyle(label).color : null,
  };
});
console.log('AFTER HOVER()', JSON.stringify(info));

await browser.close();
