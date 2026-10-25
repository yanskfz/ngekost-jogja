// E2E + accessibility smoke QA. Usage: npm run build && npm run qa:e2e
// Starts `next start`, drives Chromium via Playwright, and writes design-qa.md.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = process.env.QA_PORT ?? '3210';
const BASE = `http://localhost:${PORT}`;
const axeSource = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const results = [];
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

try { await fetch(BASE); console.error(`Port ${PORT} is already in use; refusing to test a stale server.`); process.exit(2); } catch {}
const server = spawn('npx', ['next', 'start', '-p', PORT], { stdio: 'ignore', detached: true });
const stop = () => { try { process.kill(-server.pid); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const consoleErrors = [];
const failedRequests = [];

async function newPage(width = 390, height = 844) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${page.url()} ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()} ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400 && r.status() !== 404) failedRequests.push(`${r.status()} ${r.url()}`); });
  // Aborted RSC prefetches are cancelled by in-flight navigation and are not real failures.
  page.on('requestfailed', (r) => { if (!(r.url().includes('_rsc=') && /ERR_ABORTED/.test(r.failure()?.errorText ?? ''))) failedRequests.push(`FAILED ${r.url()} ${r.failure()?.errorText}`); });
  return page;
}
const count = async (page) => (await page.locator('.cards > li').count());

try {
  const page = await newPage();

  // Homepage load
  const res = await page.goto(BASE);
  record('Homepage loads (HTTP 200)', res.status() === 200);
  record('Hero headline present', (await page.locator('h1').innerText()) === 'Temukan tempat tinggal nyaman di Jogja');
  record('Shows exactly the 3 approved non-expired dummy listings', (await count(page)) === 3, `${await count(page)} cards`);
  record('Trust checklist has 3 items', (await page.locator('.trust li').count()) === 3);
  record('Anti-scam warning visible on homepage', await page.getByText('Jangan transfer uang sebelum lihat langsung!').first().isVisible());
  record('Dummy/read-only notice visible', await page.getByText('Preview dengan data contoh').first().isVisible());
  const bodyText = await page.locator('body').innerText();
  record('No WhatsApp number shown on homepage cards', !/\+62-800|wa\.me/.test(bodyText) && (await page.locator('a[href*="wa.me"]').count()) === 0);
  record('No horizontal overflow at 390x844', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

  // Search
  await page.fill('#q', 'timoho');
  await page.click('.search button');
  await page.waitForURL(/q=timoho/);
  record('Search "timoho" returns 1 result', (await count(page)) === 1);
  await page.goto(`${BASE}/?q=zzzz`);
  record('Empty state shown for no match', (await page.locator('.empty').isVisible()) && (await count(page)) === 0);
  await page.getByRole('link', { name: 'Hapus pencarian' }).click();
  await page.waitForURL((u) => !u.search);
  record('Empty state reset restores all listings', (await count(page)) === 3);

  // Filters
  await page.getByRole('link', { name: 'Kontrakan', exact: true }).first().click();
  await page.waitForURL(/type=kontrakan/);
  record('Type filter "Kontrakan" returns 1 (expired one excluded)', (await count(page)) === 1);
  await page.getByRole('link', { name: 'Kota Jogja', exact: true }).click();
  await page.waitForURL(/area=kota_jogja/);
  record('Combined Kontrakan + Kota Jogja returns empty state (expired one excluded)', (await count(page)) === 0 && (await page.locator('.empty').isVisible()));
  await page.goto(`${BASE}/?type=kontrakan&area=sleman`);
  record('Kontrakan + Sleman returns 1', (await count(page)) === 1);
  await page.goto(`${BASE}/?type=kost&area=kota_jogja`);
  record('Kost + Kota Jogja returns 2', (await count(page)) === 2);
  await page.goto(`${BASE}/?type=kost`);
  await page.fill('#q', 'anggrek');
  await page.click('.search button');
  await page.waitForURL(/q=anggrek/);
  record('Search keeps the active type filter', page.url().includes('type=kost') && (await count(page)) === 1);

  // Category shortcut + menu
  await page.goto(BASE);
  await page.getByRole('link', { name: /Cari Kost/ }).first().click();
  await page.waitForURL(/type=kost/);
  record('"Cari Kost" category action filters to kost', (await count(page)) === 2);
  await page.goto(BASE);
  const prices = await page.locator('.card__price').allInnerTexts();
  record('Cards show reference prices and periods', prices[0].includes('1.300.000') && prices[0].includes('/ bulan') && prices[1].includes('18.000.000') && prices[1].includes('/ tahun'), prices.join(' | '));
  const fav = page.getByRole('button', { name: 'Simpan Kost Puri Timoho' });
  await fav.click();
  record('Favorite heart toggles pressed state', (await fav.getAttribute('aria-pressed')) === 'true');
  await page.reload();
  record('Favorite persists in this browser only (localStorage)', (await page.getByRole('button', { name: 'Simpan Kost Puri Timoho' }).getAttribute('aria-pressed')) === 'true');
  await page.getByRole('button', { name: 'Simpan Kost Puri Timoho' }).click();
  await page.goto(BASE);
  await page.getByLabel('Menu', { exact: true }).click();
  record('Menu opens and shows navigation', await page.getByRole('navigation', { name: 'Menu utama' }).isVisible());

  // Detail
  await page.goto(BASE);
  await page.getByRole('link', { name: 'Kost Puri Timoho' }).click();
  await page.waitForURL(/\/listing\/lst-1/);
  record('Detail page shows title, price and 3 photos', (await page.locator('h1').innerText()).includes('Timoho') && (await page.locator('.gallery img').count()) === 3);
  record('Detail shows anti-scam warning before the WhatsApp action', await page.locator('#detail-warning').isVisible());
  const wa = await page.locator('a[href^="https://wa.me/"]').count();
  record('Detail shows WhatsApp CTA (consent granted)', wa === 1);
  const order = await page.evaluate(() => {
    const w = document.querySelector('#detail-warning'); const a = document.querySelector('a[href^="https://wa.me/"]');
    return !!(w && a && (w.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  record('Warning appears before the WhatsApp CTA in DOM order', order);
  const probe = await (await browser.newContext()).newPage(); // expected 404s are kept out of console-error tracking
  for (const id of ['lst-4', 'lst-5', 'lst-6', 'lst-7', 'lst-8']) {
    const r = await probe.goto(`${BASE}/listing/${id}`);
    record(`Non-public listing ${id} (pending/hidden/expired/draft/rejected) is not viewable`, r.status() === 404);
  }

  // Keyboard + touch targets
  await page.goto(BASE);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const focusVisible = await page.evaluate(() => {
    const el = document.activeElement; if (!el || el === document.body) return false;
    const cs = getComputedStyle(el); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
  });
  record('Keyboard focus shows a visible outline', focusVisible);
  const small = await page.evaluate(() => [...document.querySelectorAll('a, button, summary, input')]
    .filter((e) => !e.closest('.menu nav') && !e.classList.contains('card__anchor') && e.getBoundingClientRect().width > 0)
    .map((e) => ({ t: (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width }))
    .filter((e) => e.h < 44 && e.w < 44 || e.h < 40));
  record('Interactive controls are ~44px tall', small.length === 0, small.map((s) => `${s.t}:${Math.round(s.h)}`).join(', '));

  const overlay = await page.evaluate(() => {
    const a = document.querySelector('.card__anchor'); const c = document.querySelector('.card');
    const r = getComputedStyle(a, '::after'); return r.position === 'absolute' && c.getBoundingClientRect().height >= 100;
  });
  record('Whole listing card is a single link target (stretched title link)', overlay);

  // Accessibility smoke (axe)
  for (const path of ['/', '/?type=kost', '/?q=zzzz', '/listing/lst-1']) {
    await page.goto(BASE + path);
    await page.evaluate(axeSource);
    const axe = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
    const bad = axe.violations.map((v) => `${v.id}(${v.impact}, ${v.nodes.length})`);
    record(`axe WCAG A/AA: ${path}`, axe.violations.length === 0, bad.join(', '));
  }

  // Responsive overflow
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
    const p = await newPage(w, h);
    for (const path of ['/', '/listing/lst-1']) {
      await p.goto(BASE + path);
      const ok = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      record(`No horizontal overflow ${w}px ${path}`, ok);
    }
    await p.context().close();
  }

  record('No console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  record('No failed critical network requests', failedRequests.length === 0, failedRequests.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  stop();
}

const failed = results.filter((r) => !r.pass);
const md = `# Design QA — Option 3\n\nGenerated by \`npm run qa:e2e\` (tests/e2e/run.mjs) on ${new Date().toISOString()}.\nRun by the implementing agent, not independent QA.\n\n**Result: ${failed.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed.length}/${results.length} checks passed.**\n\n| Result | Check | Detail |\n| --- | --- | --- |\n${results.map((r) => `| ${r.pass ? 'PASS' : 'FAIL'} | ${r.name} | ${r.detail.replace(/\|/g, '/')} |`).join('\n')}\n`;
writeFileSync(new URL('../../design-qa.md', import.meta.url), md + readFileSync(new URL('./qa-notes.md', import.meta.url), 'utf8'));
process.exit(failed.length ? 1 : 0);
