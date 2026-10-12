import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const shot = (name) =>
  page.screenshot({
    path: `C:/Users/TechTeam/AppData/Local/Temp/claude/c--Users-TechTeam-Downloads-Aniket-prescon-blade-brainwing/6ec51987-99e2-4eab-9ff9-ff11b8b52e67/scratchpad/${name}.png`,
  });

await page.goto('http://localhost:5193/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await shot('demo-01-register');

await page.fill('input[autocomplete="name"]', 'Test User');
await page.fill('input[type="tel"]', '9136355456');
await shot('demo-02-filled');

await browser.close();
