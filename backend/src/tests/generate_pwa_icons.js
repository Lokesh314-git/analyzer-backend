import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve(process.cwd(), 'frontend', 'public');
const distDir = path.resolve(process.cwd(), 'frontend', 'dist');

// SVG template for standard app icon
function getStandardSvg(size) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563EB" />
          <stop offset="100%" stop-color="#1D4ED8" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#grad)" />
      <!-- Graduation Cap Icon -->
      <g fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" transform="translate(64, 60) scale(0.75)">
        <path d="M256 64 L32 176 L256 288 L480 176 Z" fill="#FFFFFF" fill-opacity="0.15" />
        <path d="M104 220 L104 360 C104 416 408 416 408 360 L408 220" />
        <path d="M480 176 L480 320" />
        <!-- Analytics chart lines inside -->
        <path d="M160 330 L200 290 L260 330 L350 250" stroke="#60A5FA" stroke-width="28" />
        <circle cx="350" cy="250" r="16" fill="#60A5FA" />
      </g>
    </svg>
  `;
}

// SVG template for maskable icon (full bleed background, content in 80% safe zone)
function getMaskableSvg(size) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
      <defs>
        <linearGradient id="gradMask" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E40AF" />
          <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#gradMask)" />
      <!-- Graduation Cap Icon scaled into safe zone -->
      <g fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" transform="translate(90, 85) scale(0.65)">
        <path d="M256 64 L32 176 L256 288 L480 176 Z" fill="#FFFFFF" fill-opacity="0.18" />
        <path d="M104 220 L104 360 C104 416 408 416 408 360 L408 220" />
        <path d="M480 176 L480 320" />
        <!-- Analytics chart lines inside -->
        <path d="M160 330 L200 290 L260 330 L350 250" stroke="#60A5FA" stroke-width="28" />
        <circle cx="350" cy="250" r="16" fill="#60A5FA" />
      </g>
    </svg>
  `;
}

async function generateIcons() {
  console.log('Launching Chromium to render PNG icons...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const page = await browser.newPage();

  const iconsToGenerate = [
    { name: 'icon-192.png', size: 192, svg: getStandardSvg(192) },
    { name: 'icon-512.png', size: 512, svg: getStandardSvg(512) },
    { name: 'icon-maskable-192.png', size: 192, svg: getMaskableSvg(192) },
    { name: 'icon-maskable-512.png', size: 512, svg: getMaskableSvg(512) },
    { name: 'apple-touch-icon.png', size: 180, svg: getStandardSvg(180) },
  ];

  for (const item of iconsToGenerate) {
    await page.setViewportSize({ width: item.size, height: item.size });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body, html { margin: 0; padding: 0; overflow: hidden; background: transparent; }
            svg { display: block; width: ${item.size}px; height: ${item.size}px; }
          </style>
        </head>
        <body>${item.svg}</body>
      </html>
    `);

    const outPathPub = path.join(publicDir, item.name);
    await page.screenshot({ path: outPathPub, omitBackground: true });
    console.log(`Generated: ${outPathPub} (${item.size}x${item.size})`);

    if (fs.existsSync(distDir)) {
      const outPathDist = path.join(distDir, item.name);
      fs.copyFileSync(outPathPub, outPathDist);
    }
  }

  await browser.close();
  console.log('All PWA PNG icons generated successfully!');
}

generateIcons().catch(console.error);
