import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const VIEWPORTS = [
  { width: 320, height: 568, name: '320px (Mobile Small)' },
  { width: 360, height: 640, name: '360px (Android Small)' },
  { width: 375, height: 667, name: '375px (iPhone SE)' },
  { width: 390, height: 844, name: '390px (iPhone 12/13/14)' },
  { width: 430, height: 932, name: '430px (iPhone 15 Pro Max)' },
];

async function runAudit() {
  console.log('====================================================');
  console.log('STARTING PWA & FIXED MOBILE HEADER VERIFICATION AUDIT');
  console.log('====================================================');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();

  // --- PART 1: PWA MANIFEST & ASSETS AUDIT ---
  console.log('\n--- 1. PWA MANIFEST VERIFICATION ---');
  const manifestRes = await page.goto('http://localhost:5173/manifest.webmanifest');
  if (manifestRes.status() !== 200) {
    throw new Error(`Failed to load manifest.webmanifest: status ${manifestRes.status()}`);
  }
  const manifestJson = JSON.parse(await manifestRes.text());

  console.log('Manifest name:', manifestJson.name);
  console.log('Manifest short_name:', manifestJson.short_name);
  console.log('Manifest display:', manifestJson.display);
  console.log('Manifest orientation:', manifestJson.orientation);
  console.log('Manifest theme_color:', manifestJson.theme_color);
  console.log('Manifest background_color:', manifestJson.background_color);
  console.log('Manifest icons count:', manifestJson.icons.length);

  if (manifestJson.name !== 'Student Marks Analytics') {
    throw new Error(`Expected name 'Student Marks Analytics' but got '${manifestJson.name}'`);
  }
  if (manifestJson.short_name !== 'MarksAnalytics') {
    throw new Error(`Expected short_name 'MarksAnalytics' but got '${manifestJson.short_name}'`);
  }
  if (manifestJson.display !== 'standalone') {
    throw new Error(`Expected display 'standalone' but got '${manifestJson.display}'`);
  }
  if (manifestJson.theme_color !== '#0F172A') {
    throw new Error(`Expected theme_color '#0F172A' but got '${manifestJson.theme_color}'`);
  }

  // Verify all icon files are reachable with HTTP 200
  console.log('\n--- 2. PWA ICONS HTTP VERIFICATION ---');
  for (const icon of manifestJson.icons) {
    const iconRes = await page.goto(`http://localhost:5173${icon.src}`);
    console.log(`Icon: ${icon.src} (${icon.sizes}, ${icon.purpose || 'any'}) -> HTTP ${iconRes.status()}`);
    if (iconRes.status() !== 200) {
      throw new Error(`Icon ${icon.src} failed to load (HTTP ${iconRes.status()})`);
    }
  }

  // --- PART 2: SERVICE WORKER & DATA PRIVACY AUDIT ---
  console.log('\n--- 3. SERVICE WORKER & DATA PRIVACY AUDIT ---');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check SW registration in browser
  const swRegistered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg;
  });
  console.log('Service worker registered in browser:', swRegistered);

  // Check that CacheStorage does NOT contain student records or API responses
  const cacheContents = await page.evaluate(async () => {
    if (!('caches' in window)) return [];
    const keys = await caches.keys();
    const results = [];
    for (const key of keys) {
      const cache = await caches.open(key);
      const requests = await cache.keys();
      results.push({
        cacheName: key,
        urls: requests.map(r => r.url)
      });
    }
    return results;
  });

  console.log('Caches inspected:', cacheContents.map(c => c.cacheName));
  for (const c of cacheContents) {
    const apiCaches = c.urls.filter(u => u.includes('/api/'));
    if (apiCaches.length > 0) {
      throw new Error(`DATA PRIVACY VIOLATION: Found ${apiCaches.length} API requests stored in CacheStorage!`);
    }
  }
  console.log('PASS: CacheStorage contains ZERO student marks or /api/ responses.');

  // --- PART 3: MOBILE FIXED HEADER ACROSS VIEWPORTS ---
  console.log('\n--- 4. MOBILE TOP NAVIGATION BAR FIXED BEHAVIOR & SCROLLING ---');

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Initial Header Position
    const headerStyle = await page.$eval('header', el => {
      const computed = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        position: computed.position,
        top: computed.top,
        zIndex: computed.zIndex,
        width: rect.width,
        height: rect.height,
        boundingTop: rect.top
      };
    });

    console.log(`  Initial: position=${headerStyle.position}, top=${headerStyle.top}, zIndex=${headerStyle.zIndex}, height=${headerStyle.height}px, rectTop=${headerStyle.boundingTop}`);
    if (headerStyle.position !== 'fixed') {
      throw new Error(`Viewport ${vp.name}: Expected header position 'fixed' but got '${headerStyle.position}'`);
    }
    if (headerStyle.boundingTop !== 0) {
      throw new Error(`Viewport ${vp.name}: Expected header rect.top 0 but got ${headerStyle.boundingTop}`);
    }
    if (parseInt(headerStyle.zIndex, 10) < 1000) {
      throw new Error(`Viewport ${vp.name}: Expected header z-index >= 1000 but got ${headerStyle.zIndex}`);
    }

    // Check main content top position (must NOT overlap header)
    const contentTop = await page.$eval('main', el => el.getBoundingClientRect().top);
    console.log(`  Main content rect.top: ${contentTop}px (Header height: ${headerStyle.height}px)`);
    if (contentTop < headerStyle.height) {
      throw new Error(`Viewport ${vp.name}: Content overlaps header! contentTop=${contentTop} < headerHeight=${headerStyle.height}`);
    }

    // Scroll Down 400px
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(400);

    const scrolledHeaderStyle = await page.$eval('header', el => {
      const rect = el.getBoundingClientRect();
      return {
        boundingTop: rect.top,
        boundingBottom: rect.bottom,
        windowScrollY: window.scrollY
      };
    });

    console.log(`  After Scroll (scrollY=${scrolledHeaderStyle.windowScrollY}px): Header rect.top=${scrolledHeaderStyle.boundingTop}px`);
    if (scrolledHeaderStyle.boundingTop !== 0) {
      throw new Error(`Viewport ${vp.name}: Header scrolled with page content! rect.top=${scrolledHeaderStyle.boundingTop}`);
    }

    // Check Mobile Sidebar Drawer opens above the fixed header
    await page.click('button[aria-label="Open navigation menu"]');
    await page.waitForTimeout(400);

    const drawerZIndex = await page.$eval('aside', el => {
      const computed = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        zIndex: computed.zIndex,
        translateX: rect.left
      };
    });
    console.log(`  Drawer Open: zIndex=${drawerZIndex.zIndex}, left=${drawerZIndex.translateX}px`);
    if (parseInt(drawerZIndex.zIndex, 10) <= 1000) {
      throw new Error(`Viewport ${vp.name}: Sidebar drawer zIndex (${drawerZIndex.zIndex}) must be higher than header (1000)`);
    }

    // Close drawer
    await page.click('button[aria-label="Close sidebar"]');
    await page.waitForTimeout(300);
  }

  // --- PART 4: DESKTOP HEADER PRESERVATION ---
  console.log('\n--- 5. DESKTOP VIEWPORT PRESERVATION (1280px) ---');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const desktopHeaderStyle = await page.$eval('header', el => {
    const computed = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      position: computed.position,
      top: computed.top,
      zIndex: computed.zIndex,
      rectWidth: rect.width,
      rectLeft: rect.left
    };
  });

  console.log(`Desktop Header: position=${desktopHeaderStyle.position}, left=${desktopHeaderStyle.rectLeft}px, width=${desktopHeaderStyle.rectWidth}px`);
  if (desktopHeaderStyle.position !== 'sticky') {
    throw new Error(`Desktop header position should be 'sticky', got '${desktopHeaderStyle.position}'`);
  }
  if (desktopHeaderStyle.rectLeft < 200) {
    throw new Error(`Desktop header rect.left should account for 256px sidebar, got ${desktopHeaderStyle.rectLeft}px`);
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('ALL PWA & MOBILE FIXED HEADER VERIFICATIONS PASSED 100%!');
  console.log('====================================================');
}

runAudit().catch(err => {
  console.error('\nAUDIT FAILED:', err.message);
  process.exit(1);
});

