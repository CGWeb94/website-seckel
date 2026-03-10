import { createRequire } from 'module';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/Chris/AppData/Roaming/npm/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

// Discover Chrome version folder
const chromeBase = 'C:/Users/Chris/.cache/puppeteer/chrome/';
const versions   = readdirSync(chromeBase).filter(d => existsSync(join(chromeBase, d, 'chrome-win64', 'chrome.exe')));
if (!versions.length) { console.error('Chrome not found in', chromeBase); process.exit(1); }
const executablePath = join(chromeBase, versions[0], 'chrome-win64', 'chrome.exe');

// Auto-increment screenshot filename
const screenshotDir = join(__dirname, 'temporary screenshots');
let n = 1;
while (existsSync(join(screenshotDir, label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`))) n++;
const outFile = join(screenshotDir, label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`);

import { mkdirSync } from 'fs';
mkdirSync(screenshotDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new',
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  // Scroll through page to trigger all ScrollTrigger onEnter callbacks
  await page.evaluate(async () => {
    const totalHeight = document.body.scrollHeight;
    const step = 600;
    for (let y = 0; y <= totalHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 60));
    }
  });
  await new Promise(r => setTimeout(r, 400));

  // Force GSAP to complete all animations, then scroll back to top
  await page.evaluate(() => {
    if (window.gsap) {
      gsap.globalTimeline.progress(1, true);
      gsap.globalTimeline.pause();
      // Also refresh ScrollTrigger so any pending reveals are shown
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: outFile, fullPage: true });
  await browser.close();
  console.log('Screenshot saved:', outFile);
})();
