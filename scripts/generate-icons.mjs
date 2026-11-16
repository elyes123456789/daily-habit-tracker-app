// Renders the app icon set from one SVG mark. Run: node scripts/generate-icons.mjs
// Uses the Chromium that Playwright already installs for the end-to-end tests.
import { chromium } from '@playwright/test';

const PAPER = '#F5F1E8';
const GREEN = '#3A6650';

/** A ring that is three-quarters complete, with a check mark: a day being ticked off. */
const mark = (color, scale = 1) => `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)" fill="none" stroke="${color}"
     stroke-width="72" stroke-linecap="round" stroke-linejoin="round">
    <path d="M512 232 a280 280 0 1 0 280 280" opacity="0.45"/>
    <path d="M392 520 l88 88 l200 -216"/>
  </g>`;

const svg = (body, background) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    ${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}${body}
  </svg>`;

const icons = [
  // [file, size, svg]
  ['assets/images/icon.png', 1024, svg(mark('#FFFFFF', 0.82), GREEN)],
  ['assets/images/splash-icon.png', 512, svg(mark(GREEN, 0.9))],
  ['assets/images/favicon.png', 48, svg(`<rect width="1024" height="1024" rx="220" fill="${GREEN}"/>${mark('#FFFFFF', 0.8)}`)],
  // Android adaptive icons keep the mark inside the central safe zone (about 61%).
  ['assets/images/android-icon-foreground.png', 1024, svg(mark(GREEN, 0.52))],
  ['assets/images/android-icon-background.png', 1024, svg('', PAPER)],
  ['assets/images/android-icon-monochrome.png', 1024, svg(mark('#000000', 0.52))],
  ['public/icons/icon-192.png', 192, svg(`<rect width="1024" height="1024" rx="220" fill="${GREEN}"/>${mark('#FFFFFF', 0.8)}`)],
  ['public/icons/icon-512.png', 512, svg(`<rect width="1024" height="1024" rx="220" fill="${GREEN}"/>${mark('#FFFFFF', 0.8)}`)],
  ['public/icons/icon-maskable-512.png', 512, svg(mark('#FFFFFF', 0.6), GREEN)],
];

const browser = await chromium.launch();
for (const [file, size, markup] of icons) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`,
  );
  await page.screenshot({ path: file, omitBackground: true });
  await page.close();
  console.log(`wrote ${file} (${size}px)`);
}
await browser.close();
