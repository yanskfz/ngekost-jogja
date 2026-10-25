// E2E + accessibility smoke QA. Usage: npm run build && npm run qa:e2e
// Starts `next start`, drives Chromium via Playwright, and writes design-qa.md.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = process.env.QA_PORT ?? '3210';
const BASE = `http://localhost:${PORT}`;
const axeSource = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const CONSENT = { name: 'nk_safety_consent', value: '2026-10-v1', url: BASE };
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

/** consent: grant the safety-consent cookie up front (the modal flow itself is tested through the UI). */
async function newPage({ width = 390, height = 844, consent = true, js = true, track = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: js });
  if (consent) await ctx.addCookies([CONSENT]);
  const page = await ctx.newPage();
  if (track) {
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${page.url()} ${m.text()}`); });
    page.on('pageerror', (e) => consoleErrors.push(`${page.url()} ${e.message}`));
    page.on('response', (r) => { if (r.status() >= 400 && r.status() !== 404) failedRequests.push(`${r.status()} ${r.url()}`); });
    // ERR_ABORTED means the browser cancelled the request itself (a new navigation started while RSC prefetches or a
    // redirecting server action were in flight). Server errors (4xx/5xx) and every other network error still count.
    page.on('requestfailed', (r) => { if (!/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) failedRequests.push(`FAILED ${r.url()} ${r.failure()?.errorText}`); });
  }
  return page;
}
const count = (page) => page.locator('.cards > li').count();
const modalVisible = (page) => page.getByRole('dialog').isVisible().catch(() => false);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const axeViolations = async (page) => {
  await page.evaluate(axeSource);
  return (await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }))).violations
    .map((v) => `${v.id}(${v.impact}, ${v.nodes.length})`);
};
const TITLES = { locked4: 'Kost Putri Contoh Cempaka', locked5: 'Rumah Kontrakan Contoh Mawar' };

try {
  // ===== Blocking anti-scam consent modal (390x844, no consent cookie) =====
  {
    const page = await newPage({ consent: false });
    const res = await page.goto(BASE);
    record('First visit: homepage responds 200 and opens the blocking safety modal', res.status() === 200 && (await modalVisible(page)));
    record('Modal shows the title and the "Baca panduan lengkap" disclosure', (await page.locator('#consent-title').innerText()) === 'Jangan transfer uang sebelum lihat langsung!' && (await page.getByText('Baca panduan lengkap').isVisible()));
    const html = await page.content();
    record('No listing content is in the page while consent is missing', !html.includes('Kost Puri Timoho') && !html.includes('wa.me') && (await count(page)) === 0);
    const checkbox = page.getByRole('checkbox');
    const submit = page.getByRole('button', { name: 'Saya paham, lanjut melihat listing' });
    record('Checkbox is unchecked by default and the primary action is disabled', !(await checkbox.isChecked()) && (await submit.isDisabled()));
    record('Modal has no close control', (await page.getByRole('button', { name: /tutup|close|batal/i }).count()) === 0);
    await page.keyboard.press('Escape');
    record('Escape does not close the modal', await modalVisible(page));
    await page.locator('.modal-backdrop').click({ position: { x: 4, y: 4 } });
    record('Backdrop click does not close the modal', await modalVisible(page));
    let trapped = true;
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); trapped &&= await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')); }
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Shift+Tab'); trapped &&= await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')); }
    record('Keyboard focus stays inside the modal (Tab and Shift+Tab)', trapped);
    await page.getByText('Baca panduan lengkap').click();
    record('"Baca panduan lengkap" expands the full guidance', await page.getByText('Verifikasi pemilik atau makelar secara mandiri').isVisible());
    await page.getByText('Baca panduan lengkap').click();
    record('Modal fits 390x844 without horizontal overflow', !(await overflow(page)));
    const viol = await axeViolations(page);
    record('axe WCAG A/AA: consent modal', viol.length === 0, viol.join(', '));
    await page.reload();
    record('Refresh before consent does not bypass the modal', await modalVisible(page));
    for (const path of ['/listing/lst-1', '/listing/lst-9', '/?q=timoho', '/masuk']) {
      await page.goto(BASE + path);
      const h = await page.content();
      record(`Direct URL ${path} before consent shows only the modal`, (await modalVisible(page)) && !h.includes('Timoho') && !h.includes(TITLES.locked4) && !h.includes('wa.me'));
    }
    await page.goto(BASE);
    // Tamper: enable the button without ticking the checkbox; the server must still refuse.
    await page.evaluate(() => document.querySelector('button[type=submit]')?.removeAttribute('disabled'));
    await page.getByRole('button', { name: 'Saya paham, lanjut melihat listing' }).click();
    await page.waitForTimeout(800);
    record('Submitting without the checkbox (button force-enabled) is rejected server-side', await modalVisible(page));
    await page.reload();
    await page.getByRole('checkbox').check();
    const enabled = await page.getByRole('button', { name: 'Saya paham, lanjut melihat listing' }).isEnabled();
    await page.getByRole('button', { name: 'Saya paham, lanjut melihat listing' }).click();
    await page.getByRole('heading', { level: 1 }).waitFor();
    record('Ticking the checkbox enables the action; confirming closes the modal and shows the listings', enabled && !(await modalVisible(page)) && (await count(page)) === 3);
    await page.reload();
    record('Consent persists across refresh in this browser', !(await modalVisible(page)) && (await count(page)) === 3);
    await page.goto(`${BASE}/listing/lst-1`);
    record('After consent a direct listing URL is accessible', (await page.locator('h1').innerText()).includes('Timoho'));
    await page.context().close();
  }

  // ===== Anonymous listing gate (consented, signed out) =====
  {
    const page = await newPage();
    await page.goto(BASE);
    const html = await page.content();
    record('Anonymous: exactly 3 complete listings', (await count(page)) === 3, `${await count(page)} cards`);
    record('Anonymous: one locked gate with 2 locked teasers', (await page.getByTestId('listing-gate').count()) === 1 && (await page.getByTestId('locked-teaser').count()) === 2);
    record('Anonymous: gate explains signup/login and is labelled demo', (await page.getByText('2 listing lainnya terkunci').isVisible()) && (await page.getByText(/Mode demo/).first().isVisible()));
    record('Anonymous: locked listings are absent from the HTML (not just hidden)', !html.includes(TITLES.locked4) && !html.includes(TITLES.locked5) && !html.includes('lst-9') && !html.includes('lst-10') && !html.includes('21.000.000'));
    await page.goto(`${BASE}/?unlocked=1&signedIn=true&limit=5&all=1`);
    record('Anonymous: query parameters cannot unlock listings', (await count(page)) === 3 && !(await page.content()).includes(TITLES.locked5));
    await page.goto(`${BASE}/?q=mawar`);
    record('Anonymous: searching for a locked listing finds nothing', (await count(page)) === 0 && (await page.getByTestId('listing-gate').count()) === 1);
    await page.goto(`${BASE}/?type=kontrakan`);
    record('Anonymous: type filter cannot surface the locked kontrakan', (await count(page)) === 1 && !(await page.content()).includes(TITLES.locked5));
    for (const id of ['lst-9', 'lst-10']) {
      const r = await page.goto(`${BASE}/listing/${id}`);
      const h = await page.content();
      record(`Anonymous: direct URL /listing/${id} does not bypass the gate`, r.status() === 200 && (await page.getByRole('heading', { name: 'Listing ini terkunci' }).isVisible()) && !h.includes('Cempaka') && !h.includes('Mawar') && !h.includes('wa.me') && (await page.locator('.gallery').count()) === 0);
    }
    await page.goto(`${BASE}/listing/lst-3`);
    record('Anonymous: the third listing detail is still viewable', (await page.locator('h1').innerText()).includes('Anggrek'));
    const noJs = await newPage({ js: false, track: false });
    await noJs.goto(BASE);
    record('Anonymous with JavaScript disabled still sees only 3 listings (limit is server-side)', (await count(noJs)) === 3 && !(await noJs.content()).includes(TITLES.locked4));
    await noJs.context().close();
    await page.goto(BASE);
    const gv = await axeViolations(page);
    record('axe WCAG A/AA: gated homepage', gv.length === 0, gv.join(', '));
    await page.context().close();
  }

  // ===== Demo-unlocked state =====
  {
    const page = await newPage();
    await page.goto(BASE);
    await page.getByLabel('Menu', { exact: true }).click();
    await page.getByRole('navigation', { name: 'Menu utama' }).getByRole('link', { name: 'Masuk / Daftar (demo)' }).click();
    await page.waitForURL(/\/masuk/);
    record('Sign-in page is labelled demo and collects no personal data', (await page.getByText('Mode demo').first().isVisible()) && (await page.locator('input:not([type=hidden])').count()) === 0);
    await page.getByRole('button', { name: 'Masuk / Daftar (demo)' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.cards > li').length === 5);
    record('Unlocked: all 5 listings are visible and the gate is gone', (await count(page)) === 5 && (await page.getByTestId('listing-gate').count()) === 0, `${await count(page)} cards`);
    await page.goto(`${BASE}/listing/lst-10`);
    record('Unlocked: the fifth listing detail opens', (await page.locator('h1').innerText()).includes('Mawar'));
    await page.goto(`${BASE}/?type=kontrakan`);
    record('Unlocked: filters include the previously locked listings', (await count(page)) === 2);
    await page.goto(BASE);
    const uv = await axeViolations(page);
    record('axe WCAG A/AA: unlocked homepage', uv.length === 0, uv.join(', '));
    await page.getByLabel('Menu', { exact: true }).click();
    await page.getByRole('button', { name: 'Keluar (demo)' }).click();
    await page.getByTestId('listing-gate').waitFor();
    record('Sign-out returns to the 3-listing anonymous state', (await count(page)) === 3 && (await page.getByTestId('listing-gate').count()) === 1);
    await page.context().close();
  }

  // ===== Homepage, search, filters (consented, anonymous) =====
  const page = await newPage();
  const res = await page.goto(BASE);
  record('Homepage loads (HTTP 200)', res.status() === 200);
  record('Hero headline present', (await page.locator('h1').innerText()) === 'Temukan tempat tinggal nyaman di Jogja');
  record('Trust checklist has 3 items', (await page.locator('.trust li').count()) === 3);
  record('Anti-scam warning visible on homepage', await page.getByText('Jangan transfer uang sebelum lihat langsung!').first().isVisible());
  record('Dummy/read-only notice visible', await page.getByText('Preview dengan data contoh').first().isVisible());
  const bodyText = await page.locator('body').innerText();
  record('No WhatsApp number shown on homepage cards', !/\+62-800|wa\.me/.test(bodyText) && (await page.locator('a[href*="wa.me"]').count()) === 0);
  record('No horizontal overflow at 390x844', !(await overflow(page)));
  const prices = await page.locator('.card__price').allInnerTexts();
  record('Cards show reference prices and periods', prices[0].includes('1.300.000') && prices[0].includes('/ bulan') && prices[1].includes('18.000.000') && prices[1].includes('/ tahun'), prices.join(' | '));

  await page.fill('#q', 'timoho');
  await page.click('.search button');
  await page.waitForURL(/q=timoho/);
  record('Search "timoho" returns 1 result', (await count(page)) === 1);
  await page.goto(`${BASE}/?q=zzzz`);
  record('Empty state shown for no match', (await page.locator('.empty').isVisible()) && (await count(page)) === 0);
  await page.getByRole('link', { name: 'Hapus pencarian' }).click();
  await page.waitForURL((u) => !u.search);
  record('Empty state reset restores the 3 allowed listings', (await count(page)) === 3);
  await page.getByRole('link', { name: 'Kontrakan', exact: true }).first().click();
  await page.waitForURL(/type=kontrakan/);
  record('Type filter "Kontrakan" returns 1 (expired and locked excluded)', (await count(page)) === 1);
  await page.getByRole('link', { name: 'Kota Jogja', exact: true }).click();
  await page.waitForURL(/area=kota_jogja/);
  record('Kontrakan + Kota Jogja returns the empty state', (await count(page)) === 0 && (await page.locator('.empty').isVisible()));
  await page.goto(`${BASE}/?type=kost&area=kota_jogja`);
  record('Kost + Kota Jogja returns 2', (await count(page)) === 2);
  await page.goto(`${BASE}/?type=kost`);
  await page.fill('#q', 'anggrek');
  await page.click('.search button');
  await page.waitForURL(/q=anggrek/);
  record('Search keeps the active type filter', page.url().includes('type=kost') && (await count(page)) === 1);
  await page.goto(BASE);
  await page.getByRole('link', { name: /Cari Kost/ }).first().click();
  await page.waitForURL(/type=kost/);
  record('"Cari Kost" category action filters to kost', (await count(page)) === 2);
  await page.goto(BASE);
  const fav = page.getByRole('button', { name: 'Simpan Kost Puri Timoho' });
  await fav.click();
  record('Favorite heart toggles pressed state', (await fav.getAttribute('aria-pressed')) === 'true');
  await page.reload();
  record('Favorite persists in this browser only (localStorage)', (await page.getByRole('button', { name: 'Simpan Kost Puri Timoho' }).getAttribute('aria-pressed')) === 'true');
  await page.getByRole('button', { name: 'Simpan Kost Puri Timoho' }).click();
  await page.getByLabel('Menu', { exact: true }).click();
  record('Menu opens and shows navigation', await page.getByRole('navigation', { name: 'Menu utama' }).isVisible());

  // ===== Detail =====
  await page.goto(BASE);
  await page.getByRole('link', { name: 'Kost Puri Timoho' }).click();
  await page.waitForURL(/\/listing\/lst-1/);
  record('Detail page shows title, price and 3 photos', (await page.locator('h1').innerText()).includes('Timoho') && (await page.locator('.gallery img').count()) === 3);
  record('Detail shows the anti-scam warning before the WhatsApp action', await page.locator('#detail-warning').isVisible());
  record('Detail shows WhatsApp CTA (consent granted)', (await page.locator('a[href^="https://wa.me/"]').count()) === 1);
  record('Warning appears before the WhatsApp CTA in DOM order', await page.evaluate(() => {
    const w = document.querySelector('#detail-warning'); const a = document.querySelector('a[href^="https://wa.me/"]');
    return !!(w && a && (w.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING));
  }));
  const probe = await (await browser.newContext()).newPage(); // expected 404s are kept out of console-error tracking
  await probe.context().addCookies([CONSENT]);
  for (const id of ['lst-4', 'lst-5', 'lst-6', 'lst-7', 'lst-8']) {
    const r = await probe.goto(`${BASE}/listing/${id}`);
    record(`Non-public listing ${id} (pending/hidden/expired/draft/rejected) is not viewable`, r.status() === 404);
  }

  // ===== Keyboard, touch targets, axe =====
  await page.goto(BASE);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  record('Keyboard focus shows a visible outline', await page.evaluate(() => {
    const el = document.activeElement; if (!el || el === document.body) return false;
    const cs = getComputedStyle(el); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
  }));
  const small = await page.evaluate(() => [...document.querySelectorAll('a, button, summary, input')]
    .filter((e) => !e.closest('.menu nav') && !e.classList.contains('card__anchor') && e.getBoundingClientRect().width > 0)
    .map((e) => ({ t: (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width }))
    .filter((e) => e.h < 44 && e.w < 44 || e.h < 40));
  record('Interactive controls are ~44px tall', small.length === 0, small.map((s) => `${s.t}:${Math.round(s.h)}`).join(', '));
  record('Whole listing card is a single link target (stretched title link)', await page.evaluate(() => {
    const a = document.querySelector('.card__anchor'); const c = document.querySelector('.card');
    return getComputedStyle(a, '::after').position === 'absolute' && c.getBoundingClientRect().height >= 100;
  }));
  for (const path of ['/', '/?type=kost', '/?q=zzzz', '/listing/lst-1', '/listing/lst-9', '/masuk']) {
    await page.goto(BASE + path);
    const bad = await axeViolations(page);
    record(`axe WCAG A/AA: ${path}`, bad.length === 0, bad.join(', '));
  }

  // ===== Responsive overflow (consented) =====
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
    const p = await newPage({ width: w, height: h });
    for (const path of ['/', '/listing/lst-1']) {
      await p.goto(BASE + path);
      record(`No horizontal overflow ${w}px ${path}`, !(await overflow(p)));
    }
    await p.context().close();
    const m = await newPage({ width: w, height: h, consent: false, track: false });
    await m.goto(BASE);
    record(`Consent modal fits ${w}x${h} (no horizontal overflow, action reachable)`, !(await overflow(m)) && (await m.getByRole('button', { name: 'Saya paham, lanjut melihat listing' }).isVisible()));
    await m.context().close();
  }

  record('No console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  record('No failed critical network requests', failedRequests.length === 0, failedRequests.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  stop();
}

const failed = results.filter((r) => !r.pass);
const md = `# Design QA — Option 3 (iteration 2)\n\nGenerated by \`npm run qa:e2e\` (tests/e2e/run.mjs) on ${new Date().toISOString()}.\nRun by the implementing agent, not independent QA.\n\n**Result: ${failed.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed.length}/${results.length} checks passed.**\n\n| Result | Check | Detail |\n| --- | --- | --- |\n${results.map((r) => `| ${r.pass ? 'PASS' : 'FAIL'} | ${r.name} | ${r.detail.replace(/\|/g, '/')} |`).join('\n')}\n`;
writeFileSync(new URL('../../design-qa.md', import.meta.url), md + readFileSync(new URL('./qa-notes.md', import.meta.url), 'utf8'));
process.exit(failed.length ? 1 : 0);
