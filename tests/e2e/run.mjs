// E2E + accessibility smoke QA. Usage: npm run build && npm run qa:e2e
// Starts `next start`, drives Chromium via Playwright, and writes design-qa.md.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = process.env.QA_PORT ?? '3210';
const BASE = `http://localhost:${PORT}`;
const axeSource = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const CONSENT = { name: 'nk_safety_consent', value: '2026-10-v1', url: BASE };
const results = [];
// Severity: P0 security/data exposure or app unavailable; P1 core journey broken or content clipped;
// P2 meaningful visual/accessibility/coverage issue; P3 polish. Assigned by check type, overridable per call.
function severityFor(name) {
  if (/consent|locked|gate|bypass|direct URL|JavaScript disabled|HTML|non-public|WhatsApp number|query parameters|server-side|Non-public/i.test(name)) return 'P0';
  if (/clip|overflow|Homepage loads|card|Detail|detail|search|filter|Search|Type filter|empty|Empty|modal fits|screenshot|sign|Sign|Unlocked|Anonymous/i.test(name)) return 'P1';
  if (/Lighthouse|Favorite|favorite|polish/i.test(name)) return 'P3';
  return 'P2';
}
const record = (name, pass, detail = '', severity = severityFor(name)) => {
  results.push({ name, status: pass ? 'PASS' : 'FAIL', severity, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${severity}] ${name}${detail ? ` — ${detail}` : ''}`);
};
const recordBlocked = (name, reason, severity = 'P2') => {
  results.push({ name, status: 'BLOCKED', severity, detail: reason });
  console.log(`BLOCKED [${severity}] ${name} — ${reason}`);
};
const SHOTS = new URL('../../docs/qa-screenshots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

try { await fetch(BASE); console.error(`Port ${PORT} is already in use; refusing to test a stale server.`); process.exit(2); } catch {}
const server = spawn('npx', ['next', 'start', '-p', PORT], { stdio: 'ignore', detached: true, env: { ...process.env, QA_FIXTURES: '1' } });
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

async function shot(page, file, target) {
  const path = SHOTS + file;
  if (target) await target.screenshot({ path }); else await page.screenshot({ path });
  const bytes = statSync(path).size;
  record(`Screenshot captured: ${file}`, bytes > 5000, `${bytes} bytes`, 'P2');
}

/** Visual-boundary check: colour distance between pixels just inside and just outside each edge midpoint of an element. */
async function edgeContrast(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const b64 = (await page.screenshot({ type: 'png' })).toString('base64');
  return page.evaluate(async ({ b64, box }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const px = (x, y) => ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const sides = {
      top: [[cx, box.y + 3], [cx, box.y - 3]], bottom: [[cx, box.y + box.height - 3], [cx, box.y + box.height + 3]],
      left: [[box.x + 3, cy], [box.x - 3, cy]], right: [[box.x + box.width - 3, cy], [box.x + box.width + 3, cy]],
    };
    const out = {};
    for (const [side, [inside, outside]] of Object.entries(sides)) {
      if (outside[0] < 0 || outside[1] < 0 || outside[0] >= img.width || outside[1] >= img.height) continue;
      out[side] = Math.round(dist(px(...inside), px(...outside)));
    }
    return out;
  }, { b64, box });
}

/** Geometry check: nothing inside a card may leave the card, the viewport, or overflow its own box. */
function cardIntegrity(page) {
  return page.evaluate(() => {
    const problems = [];
    const vw = window.innerWidth;
    document.querySelectorAll('.card').forEach((card, i) => {
      const cr = card.getBoundingClientRect();
      if (cr.left < -1 || cr.right > vw + 1) problems.push(`card${i} outside viewport`);
      card.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const tag = `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`;
        if (r.left < cr.left - 1 || r.right > cr.right + 1 || r.top < cr.top - 1 || r.bottom > cr.bottom + 1) problems.push(`card${i} ${tag} leaves card`);
        if (/title|address|price|body|facilities/.test(String(el.className)) && el.scrollWidth > el.clientWidth + 1) problems.push(`card${i} ${tag} text overflows (${el.scrollWidth}>${el.clientWidth})`);
      });
      for (const sel of ['.card__title', '.card__price', '.card__photo', '.card__chevron']) {
        const el = card.querySelector(sel);
        if (!el) problems.push(`card${i} missing ${sel}`);
        else { const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) problems.push(`card${i} ${sel} collapsed`); }
      }
    });
    return problems;
  });
}
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
    await shot(page, '01-modal-390.png');
    const modalEdge = await edgeContrast(page, page.locator('.modal__art'));
    record('Asset boundary: modal illustration is visually separated from the modal card (min edge colour distance >= 20)', Math.min(...Object.values(modalEdge)) >= 20, JSON.stringify(modalEdge), 'P2');
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
    await shot(page, '02-modal-checked-390.png');
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
    await page.goto(BASE);
    await shot(page, '06-locked-gate-390.png', page.getByTestId('listing-gate'));
    await page.goto(`${BASE}/listing/lst-9`);
    await shot(page, '07-locked-detail-390.png');
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
    await shot(page, '08-unlocked-listings-390.png', page.locator('#listing'));
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
  await shot(page, '03-home-initial-390.png');
  const cats = await page.locator('.categories').boundingBox(); const trust = await page.locator('.trust').boundingBox();
  await page.screenshot({ path: SHOTS + '03b-categories-trust-390.png', clip: { x: 0, y: cats.y - 8, width: 390, height: trust.y + trust.height - cats.y + 16 }, fullPage: true });
  record('Screenshot captured: 03b-categories-trust-390.png', statSync(SHOTS + '03b-categories-trust-390.png').size > 5000, '', 'P2');
  for (const [label, sel] of [['category Kost icon', '.category--kost img'], ['category Kontrakan icon', '.category--kontrakan img'], ['trust photo icon', '.trust li:nth-child(1) img'], ['trust WhatsApp icon', '.trust li:nth-child(2) img'], ['trust shield icon', '.trust li:nth-child(3) img']]) {
    const e = await edgeContrast(page, page.locator(sel));
    record(`Asset boundary: ${label} is visually separated from its parent surface (min edge colour distance >= 20)`, Math.min(...Object.values(e)) >= 20, JSON.stringify(e), 'P2');
  }
  record('Asset blending: category/trust/warning images do not use blend modes that dissolve their boundary', await page.evaluate(() => [...document.querySelectorAll('.category img, .trust img, .warning__art')].every((el) => getComputedStyle(el).mixBlendMode === 'normal')), '', 'P2');
  await page.goto(BASE);
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
  await page.locator('#listing').scrollIntoViewIfNeeded();
  await shot(page, '04-listing-section-390.png', page.locator('#listing'));
  await page.getByRole('link', { name: 'Kost Puri Timoho' }).click();
  await page.waitForURL(/\/listing\/lst-1/);
  await shot(page, '05-detail-390.png');
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

  // ===== Card layout regression: stress content at every required viewport =====
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    const p = await newPage({ width: w, height: h });
    await p.goto(`${BASE}/qa/cards`);
    const stress = await cardIntegrity(p);
    record(`Card layout: no clipping or overflow at ${w}px (7 stress cards: long title, unbroken word, long address, no facilities, 1 facility, yearly Rp 1.25 miliar, monthly)`, (await p.locator('.card').count()) === 7 && stress.length === 0, stress.slice(0, 4).join('; '), 'P1');
    await p.goto(BASE);
    const real = await cardIntegrity(p);
    record(`Card layout: homepage cards have no clipping or overflow at ${w}px`, real.length === 0, real.slice(0, 4).join('; '), 'P1');
    if (w === 320) {
      await p.goto(`${BASE}/qa/cards`);
      const split320 = await p.locator('.card__amount').evaluateAll((els) => els.filter((e) => e.getClientRects().length > 1).map((e) => e.textContent));
      record('Edge case at 320px: price amounts are never split across lines', split320.length === 0, split320.join(','), 'P1');
    }
    if (w === 390 || w === 320) { await p.goto(`${BASE}/qa/cards`); await shot(p, `09-stress-cards-${w}.png`, p.locator('main')); }
    if (w === 390) {
      await p.goto(`${BASE}/qa/cards`);
      const facs = await p.locator('.card').evaluateAll((cards) => cards.map((c) => c.querySelectorAll('.facilities').length));
      record('Edge case: card with empty facilities renders no facilities list and no empty gap', facs[3] === 0 && facs[4] === 1 && facs[0] === 1, facs.join(','), 'P2');
      const prices = await p.locator('.card__price').allInnerTexts();
      record('Edge case: monthly and yearly price periods render on cards', prices[2].includes('/ tahun') && prices[6].includes('/ bulan') && prices[5].includes('1.250.000.000') && prices[5].includes('/ tahun'), prices.join(' | '), 'P1');
      const splitAmounts = await p.locator('.card__amount').evaluateAll((els) => els.filter((e) => e.getClientRects().length > 1).map((e) => e.textContent));
      record('Edge case: price amounts are never split across lines (no "Rp 1.250.000.0 / 00")', splitAmounts.length === 0, splitAmounts.join(','), 'P1');
      const titles = await p.locator('.card__title').allInnerTexts();
      record('Edge case: long title and unbroken word are fully present (wrapped, not truncated)', titles[0].includes('Sangat Tenang Sekali') && titles[1].includes('Supercalifragilisticexpialidocious'), '', 'P1');
      const addr = await p.locator('.card__address').nth(2).innerText();
      record('Edge case: long address is fully present (wrapped, not truncated)', addr.includes('55281'), '', 'P1');
      const axeStress = await axeViolations(p);
      record('axe WCAG A/AA: stress cards', axeStress.length === 0, axeStress.join(', '), 'P2');
    }
    await p.context().close();
  }
  {
    // The stress-fixture route must 404 on a server started without QA_FIXTURES=1.
    const port2 = String(Number(PORT) + 1);
    const plain = spawn('npx', ['next', 'start', '-p', port2], { stdio: 'ignore', detached: true });
    let status = 0;
    for (let i = 0; i < 40 && !status; i++) {
      try { status = (await fetch(`http://localhost:${port2}/qa/cards`, { headers: { cookie: `${CONSENT.name}=${CONSENT.value}` } })).status; } catch { await new Promise((r) => setTimeout(r, 500)); }
    }
    try { process.kill(-plain.pid); } catch {}
    record('QA fixture route /qa/cards returns 404 when QA_FIXTURES is not set (not exposed in normal deployments)', status === 404, `status ${status}`, 'P1');
  }

  // ===== Accessibility tree smoke (stand-in for screen-reader structure) =====
  {
    const snap = await page.goto(BASE).then(() => page.locator('body').ariaSnapshot());
    record('Accessibility tree smoke: homepage exposes heading, search, navigation, list of listings, locked-gate heading', /heading "Temukan tempat tinggal/.test(snap) && /search/.test(snap) && /navigation/.test(snap) && /list/.test(snap) && /listing lainnya terkunci/.test(snap), '', 'P2');
    const m = await newPage({ consent: false, track: false });
    await m.goto(BASE);
    const msnap = await m.locator('body').ariaSnapshot();
    record('Accessibility tree smoke: modal exposes dialog with name, unchecked checkbox, and disabled action', /dialog/.test(msnap) && /checkbox/.test(msnap) && /Jangan transfer uang sebelum lihat langsung/.test(msnap) && /disabled/.test(msnap), '', 'P2');
    await m.context().close();
  }
  recordBlocked('Cross-browser (Firefox, WebKit) smoke', 'Only Chromium is installed in this environment and the environment forbids installing other browsers; run on Firefox/WebKit locally or in CI.', 'P2');
  recordBlocked('Screen-reader test (VoiceOver/NVDA/TalkBack)', 'No screen reader is available in this environment. Only the accessibility-tree smoke above was run.', 'P2');
  recordBlocked('Independent QA run separate from the implementer', 'Pending: this report is generated by the implementing agent and does not count as independent evidence.', 'P1');

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

const failed = results.filter((r) => r.status === 'FAIL');
const blocked = results.filter((r) => r.status === 'BLOCKED');
const passed = results.filter((r) => r.status === 'PASS');
const bySev = (sev) => results.filter((r) => r.severity === sev && r.status !== 'PASS').length;
const md = `# Design QA — Option 3 (iteration 2 + visual fixes)

Generated by \`npm run qa:e2e\` (tests/e2e/run.mjs) on ${new Date().toISOString()}.
Run by the implementing agent. **This is not independent QA**; the independent run is listed below as BLOCKED until it happens.

**Result: ${failed.length === 0 ? 'PASS' : 'FAIL'} — ${passed.length} PASS, ${failed.length} FAIL, ${blocked.length} BLOCKED (of ${results.length}).**
Open (FAIL or BLOCKED) by severity: P0 ${bySev('P0')}, P1 ${bySev('P1')}, P2 ${bySev('P2')}, P3 ${bySev('P3')}.

Severity: P0 security/data exposure, consent bypass, or app unavailable; P1 core journey broken, content clipped, or locked listing exposed; P2 meaningful visual/accessibility/coverage issue; P3 polish.
Screenshot evidence is in \`docs/qa-screenshots/\`.

| Status | Severity | Check | Evidence |
| --- | --- | --- | --- |
${results.map((r) => `| ${r.status} | ${r.severity} | ${r.name} | ${r.detail.replace(/\|/g, '/')} |`).join('\n')}
`;
writeFileSync(new URL('../../design-qa.md', import.meta.url), md + readFileSync(new URL('./qa-notes.md', import.meta.url), 'utf8'));
process.exit(failed.length ? 1 : 0);
