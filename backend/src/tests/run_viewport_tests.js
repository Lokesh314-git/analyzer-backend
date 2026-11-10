import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const VIEWPORTS = [
  { width: 320, height: 568, name: '320px (Mobile Small)' },
  { width: 360, height: 640, name: '360px (Android Small)' },
  { width: 375, height: 667, name: '375px (iPhone SE)' },
  { width: 390, height: 844, name: '390px (iPhone 12/13/14)' },
  { width: 430, height: 932, name: '430px (iPhone Pro Max)' },
  { width: 768, height: 1024, name: '768px (iPad/Tablet)' },
  { width: 1024, height: 768, name: '1024px (Small Laptop)' },
  { width: 1280, height: 800, name: '1280px (Standard Desktop)' },
  { width: 1440, height: 900, name: '1440px (MacBook/Large Laptop)' },
  { width: 1920, height: 1080, name: '1920px (Full HD Display)' },
];

const PAGES_TO_TEST = [
  '/',
  '/students',
  '/students/passed',
  '/students/failed',
  '/students/absent',
  '/subjects',
  '/cat/1',
  '/cat/3',
  '/assessment',
  '/assignment',
  '/reports',
  '/connection',
  '/settings'
];

async function runResponsiveTests() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED RESPONSIVE & VIEWPORT AUDIT');
  console.log('====================================================');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  const failures = [];
  let totalTests = 0;
  let passedTests = 0;

  const screenshotDir = path.resolve(process.cwd(), 'backend/src/tests/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const route of PAGES_TO_TEST) {
      totalTests++;
      const url = `http://localhost:5173${route}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(150);

        // Evaluate horizontal overflow
        const overflow = await page.evaluate(() => {
          const clientWidth = document.documentElement.clientWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          return {
            hasOverflow: scrollWidth > clientWidth,
            scrollWidth,
            clientWidth
          };
        });

        if (overflow.hasOverflow) {
          console.error(`  ❌ OVERFLOW on ${route}: scrollWidth=${overflow.scrollWidth}px > clientWidth=${overflow.clientWidth}px`);
          failures.push({ viewport: vp.name, route, issue: `Horizontal overflow (${overflow.scrollWidth}px > ${overflow.clientWidth}px)` });
        } else {
          passedTests++;
        }

        // Take snapshot for key viewports on dashboard and cat/3
        if ((vp.width === 375 || vp.width === 1280) && (route === '/' || route === '/cat/3')) {
          const safeName = route === '/' ? 'dashboard' : 'cat3_all_pending';
          const file = path.join(screenshotDir, `${safeName}_${vp.width}px.png`);
          await page.screenshot({ path: file, fullPage: false });
        }
      } catch (err) {
        console.error(`  ❌ ERROR on ${route}: ${err.message}`);
        failures.push({ viewport: vp.name, route, issue: err.message });
      }
    }
    console.log(`  ✓ Completed all ${PAGES_TO_TEST.length} routes at ${vp.width}px.`);
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(`AUDIT COMPLETE: ${passedTests}/${totalTests} tests passed.`);
  if (failures.length === 0) {
    console.log(`SUCCESS: All ${VIEWPORTS.length} viewports and ${PAGES_TO_TEST.length} routes passed responsive verification with 0 overflows!`);
  } else {
    console.error(`FAILURES: ${failures.length} issues detected.`);
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.log('====================================================');
}

runResponsiveTests().catch(err => {
  console.error('Fatal error in responsive test:', err);
  process.exit(1);
});
