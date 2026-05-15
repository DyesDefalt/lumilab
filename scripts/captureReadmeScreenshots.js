/**
 * One-off helper: capture dashboard panels for README screenshots.
 * Usage: npm run dashboard (other terminal) then node scripts/captureReadmeScreenshots.js
 */
import fs from 'node:fs/promises';
import puppeteer from 'puppeteer';

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:3001';
const OUT = 'docs/screenshots';
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

const panels = [
  { id: 'overview', file: 'dashboard-overview.png', nav: 'overview' },
  { id: 'issues', file: 'dashboard-issues.png', nav: 'issues' },
  { id: 'agent', file: 'dashboard-agent.png', nav: 'agent' },
];

async function waitForDashboard(page) {
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#kpi-strip .kpi-card, #score-rings .score-card', { timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
}

async function capturePanel(page, { nav, file }) {
  await page.click(`button.nav-btn[data-panel="${nav}"]`);
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: false });
  console.log(`Wrote ${OUT}/${file}`);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await waitForDashboard(page);
  for (const p of panels) await capturePanel(page, p);
  await browser.close();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
