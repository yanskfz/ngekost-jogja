// E2E + accessibility smoke QA. Usage: npm run build && npm run qa:e2e
// Starts `next start`, drives Chromium via Playwright, and writes design-qa.md.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = process.env.QA_PORT ?? '3210';
const BASE = `http://localhost:${PORT}`;
const axeSource = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const CONSENT = { name: 'nk_safety_consent', value: '2026-10-v2', url: BASE };
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
const serverLog = [];
const server = spawn('npx', ['next', 'start', '-p', PORT], { stdio: ['ignore', 'pipe', 'ignore'], detached: true, env: { ...process.env, QA_FIXTURES: '1' } });
server.stdout.on('data', (chunk) => serverLog.push(...String(chunk).split('\n').filter(Boolean)));
const loggedEvents = () => serverLog.flatMap((line) => { try { const o = JSON.parse(line); return o.type === 'nk_event' ? [o] : []; } catch { return []; } });
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
        if (/title|price|body|facilities/.test(String(el.className)) && el.scrollWidth > el.clientWidth + 1) problems.push(`card${i} ${tag} text overflows (${el.scrollWidth}>${el.clientWidth})`);
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
    record('"Baca panduan lengkap" expands the full guidance', await page.getByText('Verifikasi pemilik atau agen secara mandiri').isVisible());
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
  await page.waitForFunction(() => document.querySelector('[aria-label="Simpan Kost Puri Timoho"]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
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
  record('Detail shows the survey and WhatsApp CTAs (consent granted)', (await page.locator('a[href^="https://wa.me/"]').count()) === 2 && (await page.getByTestId('survey-cta').count()) === 1 && (await page.getByTestId('wa-cta').count()) === 1);
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
  const small = await page.evaluate(() => [...document.querySelectorAll('a, button, summary, input:not([type=checkbox]):not([type=radio])')]
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

  // ===== Trust and discovery iteration (9 approved additions) =====
  const EXACT = { 'lst-1': { lat: -7.8014, lng: 110.3896, address: 'Jl. Timoho Contoh' }, 'lst-2': { lat: -7.7681, lng: 110.3777, address: 'Jl. Depok Contoh' }, 'lst-3': { lat: -7.7829, lng: 110.3671, address: 'Jl. Contoh Anggrek' } };
  const hav = (a, b) => {
    const R = 6371008.8, rad = (d) => (d * Math.PI) / 180;
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const idsOnPage = (p) => p.locator('[data-testid=listing-card]').evaluateAll((els) => els.map((e) => e.getAttribute('data-listing-id')));
  const smallTargets = (p) => p.evaluate(() => [...document.querySelectorAll('a, button, summary, select, textarea, input[type=text], input[type=search]')]
    .filter((e) => !e.closest('.menu nav') && !e.closest('.hp') && !e.classList.contains('card__anchor') && e.getBoundingClientRect().width > 0)
    .map((e) => ({ t: (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 28), h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) }))
    .filter((e) => e.h < 44 && e.w < 44 || e.h < 40));
  const signIn = async (p) => { await p.goto(`${BASE}/masuk`); await p.getByRole('button', { name: 'Masuk / Daftar (demo)' }).click(); await p.waitForFunction(() => document.querySelectorAll('.cards > li').length === 5); };

  // --- 1/2/4: evidence, freshness, availability, role, broker fee on cards
  {
    const p = await newPage();
    await p.goto(BASE);
    const card = (id) => p.locator(`[data-listing-id="${id}"]`);
    const ev = (await card('lst-1').locator('.trust-row li').allInnerTexts()).map((t) => t.trim());
    record('Evidence row: card shows exactly the five checks the record supports, in order', JSON.stringify(ev) === JSON.stringify(['3 foto', 'WA bisa dihubungi', 'Email', 'Ditinjau admin', 'Izin tayang']), ev.join(' | '), 'P1');
    record('Role and fee are shown only when there is a fee: owner cards show neither; the agen card with a fee shows "Agen" and the fee', (await card('lst-1').locator('.tag--role').count()) === 0 && (await card('lst-3').locator('.tag--role').count()) === 0 && (await card('lst-1').locator('.card__fee').count()) === 0 && (await card('lst-2').locator('.tag--role').innerText()) === 'Agen', '', 'P1');
    const st = async (id) => (await card(id).locator('.card__status').innerText()).replace(/\s+/g, ' ');
    const s1 = await st('lst-1'), s2 = await st('lst-2'), s3 = await st('lst-3');
    const st1 = async (id) => (await card(id).locator('.card__status-text').innerText()).replace(/\s+/g, ' ').trim();
    const t1 = await st1('lst-1'), t2 = await st1('lst-2'), t3 = await st1('lst-3');
    record('Freshness and availability share one short line on every card', t1 === 'Tersedia · 10 hari lalu' && t2 === 'Belum pasti · 30 hari lalu' && t3 === 'Tersisa sedikit · 1 bulan lalu', `${t1} | ${t2} | ${t3}`, 'P1');
    const lines = await p.locator('.card__status').evaluateAll((els) => els.map((e) => { const t = e.querySelector('.card__status-text'); const cs = getComputedStyle(t); return { lines: Math.round(t.getBoundingClientRect().height / parseFloat(cs.lineHeight)), clipped: t.scrollWidth > t.clientWidth, nowrap: cs.whiteSpace === 'nowrap' }; }));
    record('Status line: exactly one line, not clipped at 390px for the three real cards', lines.length === 3 && lines.every((l) => l.lines === 1 && l.nowrap && !l.clipped), JSON.stringify(lines), 'P1');
    const full = (await card('lst-2').locator('.card__status').evaluate((e) => e.textContent ?? '')).replace(/\s+/g, ' ');
    for (const w of [360, 375]) {
      const small = await newPage({ width: w, track: false });
      await small.goto(BASE);
      const l = await small.locator('.card__status-text').evaluateAll((els) => els.map((e) => ({ lines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)), clipped: e.scrollWidth > e.clientWidth })));
      record(`Status line: one line and not clipped at ${w}px for the three real cards (including the unknown-availability card)`, l.length === 3 && l.every((x) => x.lines === 1 && !x.clipped), JSON.stringify(l), 'P1');
      await small.context().close();
    }
    record('Status line: the full wording (availability and confirmation) stays in the tooltip and screen-reader text', /Ketersediaan belum dikonfirmasi/.test(full) && /Dikonfirmasi 30 hari lalu/.test(full) && /Ketersediaan belum dikonfirmasi/.test(await card('lst-2').locator('.card__status').getAttribute('title')), '', 'P2');
    record('Availability "unknown" is not styled or worded as available', (await card('lst-2').locator('.avail--muted').count()) === 1 && (await card('lst-2').locator('.avail--ok').count()) === 0 && !/^Tersedia/.test(t2), '', 'P1');
    const fee2 = await card('lst-2').locator('.card__fee').innerText();
    record('Broker-fee transparency: agen card states the fee and that Ngekost does not collect it; owner card has no fee line', /1\.500\.000/.test(fee2) && /tidak memungut/.test(fee2) && (await card('lst-1').locator('.card__fee').count()) === 0, fee2, 'P1');
    const bodyHtml = await p.content();
    record('Cards expose a neighborhood label, never the exact address or exact coordinates', Object.values(EXACT).every((e) => !bodyHtml.includes(e.address) && !bodyHtml.includes(String(e.lat)) && !bodyHtml.includes(String(e.lng))) && /Timoho, Kec\. Umbulharjo/.test(bodyHtml), '', 'P0');
    await shot(p, '10-cards-evidence-390.png', p.locator('.cards'));
    const tt = await smallTargets(p);
    record('Touch targets on the filtered homepage (filter panel, location button, chips) are ~44px', tt.length === 0, tt.map((s) => `${s.t}:${s.h}`).join(', '), 'P2');
    await p.context().close();
  }

  // --- list card address: one line max, with an ellipsis, showing kecamatan and region
  {
    const p = await newPage();
    await p.goto(BASE);
    const addr = (id) => p.locator(`[data-listing-id="${id}"] .card__address`);
    const shown = {};
    for (const id of ['lst-1', 'lst-2', 'lst-3']) shown[id] = (await addr(id).locator('.card__address-text').innerText()).trim();
    record('Card address: shows kecamatan and region only', shown['lst-1'] === 'Kec. Umbulharjo, Kota Jogja' && shown['lst-2'] === 'Kec. Sleman, Kab. Sleman' && shown['lst-3'] === 'Kec. Gondokusuman, Kota Jogja', JSON.stringify(shown), 'P1');
    record('Card address: the full neighborhood label stays available as a tooltip and in the page text for assistive tech', (await addr('lst-1').getAttribute('title')) === 'Timoho, Kec. Umbulharjo, Kota Jogja' && /Timoho/.test(await addr('lst-1').evaluate((e) => e.textContent ?? '')) , '', 'P2');
    const oneLine = await p.locator('.card__address-text').evaluateAll((els) => els.map((e) => { const cs = getComputedStyle(e); return { lines: Math.round(e.getBoundingClientRect().height / parseFloat(cs.lineHeight)), nowrap: cs.whiteSpace === 'nowrap', ellipsis: cs.textOverflow === 'ellipsis' }; }));
    record('Card address: exactly one line with an ellipsis rule on every card', oneLine.length === 3 && oneLine.every((o) => o.lines === 1 && o.nowrap && o.ellipsis), JSON.stringify(oneLine), 'P1');
    await p.goto(`${BASE}/listing/lst-1`);
    record('Detail keeps the full neighborhood label', /Timoho, Kec\. Umbulharjo, Kota Jogja/.test(await p.locator('main').innerText()), '', 'P2');
    const q = await newPage();
    await q.goto(`${BASE}/qa/cards`);
    const stress = await q.locator('.card__address').evaluateAll((els) => els.map((e) => { const t = e.querySelector('.card__address-text'); const cs = getComputedStyle(t); return { text: t.textContent.trim(), lines: Math.round(t.getBoundingClientRect().height / parseFloat(cs.lineHeight)), clipped: t.scrollWidth > t.clientWidth, full: e.getAttribute('title') }; }));
    record('Card address (stress): the 160-character address becomes "Kec. Depok, Kab. Sleman" on one line', stress[2].text === 'Kec. Depok, Kab. Sleman' && stress[2].lines === 1 && /RT 04 RW 09/.test(stress[2].full), JSON.stringify(stress[2]).slice(0, 160), 'P1');
    record('Card address (stress): an unbroken 100-character string is cut with an ellipsis on one line, not wrapped', stress[1].lines === 1 && stress[1].clipped && /PanjangTanpaSpasi/.test(stress[1].full), '', 'P1');
    record('Card address (stress): every stress card keeps its address to one line', stress.every((s) => s.lines === 1), stress.map((s) => s.lines).join(','), 'P1');
    const statusLines = await q.locator('.card__status-text').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight))));
    record('Status line (stress): every stress card keeps availability and confirmation to one line', statusLines.length === 10 && statusLines.every((n) => n === 1), statusLines.join(','), 'P1');
    await shot(q, '16-stress-cards-address-390.png', q.locator('.cards'));
    await q.context().close();
    await p.context().close();
  }

  // --- 1/2/3/4/8: detail page
  {
    const p = await newPage();
    const osm = [];
    p.on('request', (r) => { if (/openstreetmap\.org/.test(r.url())) osm.push(r.url()); });
    await p.route(/openstreetmap\.org\/export\/embed/, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>map stub</title><p>stub</p>' }));
    await p.goto(`${BASE}/listing/lst-2`);
    const status = (await p.getByTestId('status-panel').innerText()).replace(/\s+/g, ' ');
    record('Detail: availability, last-confirmed date, and expiry are shown (unknown availability is not "Tersedia")', /Ketersediaan belum dikonfirmasi/.test(status) && /Terakhir dikonfirmasi \d{1,2} \S+ 2026 \(30 hari lalu\)/.test(status) && /Tayang sampai \d{1,2} \S+ 2026/.test(status), status, 'P1');
    record('Detail: broker-fee note names the role and the amount', /Agen:.*1\.500\.000/.test(await p.getByTestId('fee-note').innerText()), '', 'P1');
    record('Detail: trust panel lists 5 checks as ok and carries the non-guarantee disclaimer', (await p.locator('.trust-panel li.is-ok').count()) === 5 && /bukan jaminan keamanan/.test(await p.locator('.trust-panel').innerText()), '', 'P1');
    await shot(p, '11-detail-trust-390.png', p.locator('main'));
    // map
    record('Map: approximate-area preview renders without any request to a map provider', (await p.locator('.map svg[role=img]').isVisible()) && (await p.locator('.map iframe').count()) === 0 && osm.length === 0, osm.join(','), 'P1');
    const links = await p.locator('.map__actions a').evaluateAll((as) => as.map((a) => ({ href: a.href, target: a.target, rel: a.rel })));
    const osmLink = new URL(links.find((l) => /openstreetmap/.test(l.href)).href);
    const approx = { lat: Number(osmLink.searchParams.get('mlat')), lng: Number(osmLink.searchParams.get('mlon')) };
    const dist = hav(EXACT['lst-2'], approx);
    record('Map: the shown point is 300–500 m from the real location and is not the real location', dist >= 300 && dist <= 500, `${Math.round(dist)} m`, 'P0');
    record('Map: "Buka di OpenStreetMap" and "Buka di Google Maps" open the same approximate point in a new tab safely', links.length === 2 && links.every((l) => l.target === '_blank' && /noopener/.test(l.rel)) && new URL(links[1].href).searchParams.get('query') === `${approx.lat.toFixed(4)},${approx.lng.toFixed(4)}`, '', 'P1');
    record('Map: no link, attribute, or script payload on the page carries the exact coordinates or private address', !(await p.content()).includes(String(EXACT['lst-2'].lat)) && !(await p.content()).includes(String(EXACT['lst-2'].lng)) && !(await p.content()).includes(EXACT['lst-2'].address), '', 'P0');
    await p.getByRole('button', { name: 'Tampilkan peta' }).click();
    const frame = p.locator('.map iframe');
    await frame.waitFor();
    const src = await frame.getAttribute('src');
    record('Map: tapping "Tampilkan peta" loads an OpenStreetMap embed centred on the approximate point only', /^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?/.test(src) && !src.includes(String(EXACT['lst-2'].lat)) && !src.includes(String(EXACT['lst-2'].lng)) && (await frame.getAttribute('title')).includes('Depok') && (await p.getByRole('button', { name: 'Sembunyikan peta' }).getAttribute('aria-expanded')) === 'true', src, 'P1');
    await shot(p, '12-detail-map-390.png', p.locator('.map'));
    const me = await edgeContrast(p, p.locator('.map__frame'));
    record('Asset boundary: the map frame is visually separated from the page (min edge colour distance >= 18)', Math.min(...Object.values(me)) >= 18, JSON.stringify(me), 'P2');
    await p.getByRole('button', { name: 'Sembunyikan peta' }).click();
    record('Map: hiding the map removes the frame again', (await p.locator('.map iframe').count()) === 0, '', 'P2');
    // survey + contact
    const surveyHref = await p.getByTestId('survey-cta').getAttribute('href');
    const surveyText = new URL(surveyHref).searchParams.get('text');
    record('Survey template: "Jadwalkan survei" opens WhatsApp with a prefilled visit request (title, contact, neighborhood) and no payment', surveyHref.startsWith('https://wa.me/6280000000102?text=') && /Rumah Kontrakan Sari Asri/.test(surveyText) && /Kontak Contoh 2/.test(surveyText) && /Depok, Kec\. Sleman/.test(surveyText) && /survei langsung/.test(surveyText) && /belum akan membayar/.test(surveyText) && !/rp\s?\d|deposit|rekening|booking/i.test(surveyText), surveyHref.slice(0, 60), 'P0');
    await p.getByText('Lihat pesan survei').click();
    record('Survey template: the exact message can be read before sending', (await p.getByTestId('survey-text').innerText()).trim() === surveyText.trim(), '', 'P2');
    record('Survey and WhatsApp actions are separate, safe links; warning comes first in DOM order', (await p.getByTestId('wa-cta').getAttribute('href')) === 'https://wa.me/6280000000102' && (await p.evaluate(() => {
      const w = document.querySelector('#detail-warning'); const s = document.querySelector('[data-testid=survey-cta]'); const a = document.querySelector('[data-testid=wa-cta]');
      return !!(w.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(w.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
    })) && (await p.locator('[data-testid=survey-cta], [data-testid=wa-cta]').evaluateAll((as) => as.every((a) => a.target === '_blank' && /noopener/.test(a.rel)))), '', 'P0');
    // photos
    const srcs = await p.locator('[data-testid=gallery] img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')));
    for (const i of await p.locator('[data-testid=gallery] img').all()) await i.scrollIntoViewIfNeeded();
    await p.waitForFunction(() => [...document.querySelectorAll('[data-testid=gallery] img')].every((i) => i.complete && i.naturalWidth > 0));
    record('Photos: the gallery shows three different image files and all of them load', srcs.length === 3 && new Set(srcs).size === 3, srcs.join(','), 'P1');
    const overlay = await p.evaluate(async () => {
      const files = ['photo-kost', 'photo-kost-2', 'photo-kost-3', 'photo-kontrakan', 'photo-kontrakan-2', 'photo-kontrakan-3'];
      const out = {};
      for (const f of files) {
        const bmp = await createImageBitmap(await (await fetch(`/images/${f}.webp`)).blob());
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const x = c.getContext('2d'); x.drawImage(bmp, 0, 0);
        const w = Math.min(56, bmp.width), h = Math.min(56, bmp.height);
        const d = x.getImageData(bmp.width - w, 0, w, h).data; let white = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245) white++;
        out[f] = +(white / (w * h)).toFixed(2);
      }
      return out;
    });
    record('Photo assets contain no baked-in UI: the mockup heart overlay (white disc) is absent from every photo corner', Object.values(overlay).every((v) => v < 0.08), JSON.stringify(overlay), 'P1');
    await p.getByText('Cek foto sebelum survei').focus();
    await p.keyboard.press('Enter');
    const gtxt = await p.locator('.guidance').innerText();
    record('Photo guidance: keyboard-operable, names the three photo slots and the "three different photos" rule', /Kamar atau ruang utama/.test(gtxt) && /Kamar mandi, dapur, atau fasilitas/.test(gtxt) && /Tampak depan dan lingkungan/.test(gtxt) && /Tiga foto harus berbeda/.test(gtxt) && /Laporkan listing/.test(gtxt), '', 'P2');
    record('Detail: a report link is available', (await p.getByRole('link', { name: 'Laporkan listing ini' }).getAttribute('href')) === '/listing/lst-2/laporkan', '', 'P1');
    const dt = await smallTargets(p);
    record('Touch targets on the detail page are ~44px', dt.length === 0, dt.map((s) => `${s.t}:${s.h}`).join(', '), 'P2');
    const dv = await axeViolations(p);
    record('axe WCAG A/AA: detail page with map open state and guidance expanded', dv.length === 0, dv.join(', '), 'P2');
    await p.context().close();
  }

  // --- detail: owner variation, locked listing has no contact surface, privacy of the raw response
  {
    const p = await newPage();
    await p.goto(`${BASE}/listing/lst-1`);
    record('Detail (owner): no role badge, no broker-fee note, and no "tanpa biaya makelar" text anywhere', (await p.getByTestId('fee-note').count()) === 0 && (await p.locator('.tag--role').count()) === 0 && !/tanpa biaya makelar|Pemilik langsung/i.test(await p.locator('main').innerText()), '', 'P1');
    for (const id of ['lst-1', 'lst-2', 'lst-3']) {
      const raw = await (await p.request.get(`${BASE}/listing/${id}`)).text();
      record(`Privacy: raw response for /listing/${id} contains no exact coordinates, private address, owner id, or source`, !raw.includes(String(EXACT[id].lat)) && !raw.includes(String(EXACT[id].lng)) && !raw.includes(EXACT[id].address) && !/owner_id|acc-owner|acc-broker|dummy-fixture/.test(raw), '', 'P0');
    }
    const lockedRaw = await (await p.request.get(`${BASE}/listing/lst-9`)).text();
    record('Locked listing page has no contact, survey, map, or report surface', !/wa\.me|survey-cta|class="map"|lst-9\/laporkan|Laporkan listing/.test(lockedRaw) && !/Cempaka/.test(lockedRaw), '', 'P0');
    const qd = await newPage();
    await qd.goto(`${BASE}/qa/detail`);
    record('Missing-data detail: unverified evidence reads "belum", no contact consent hides survey/WhatsApp, report link stays', (await qd.locator('.trust-panel li.is-missing').count()) === 5 && (await qd.getByTestId('survey-cta').count()) === 0 && /belum mengizinkan kontak/.test(await qd.locator('main').innerText()) && (await qd.getByRole('link', { name: 'Laporkan listing ini' }).count()) === 1, '', 'P1');
    await shot(qd, '15-qa-detail-390.png', qd.locator('main'));
    record('Long-content detail has no horizontal overflow at 390px', !(await overflow(qd)), '', 'P1');
    const qv = await axeViolations(qd);
    record('axe WCAG A/AA: detail page with nothing verified and long text', qv.length === 0, qv.join(', '), 'P2');
    await qd.context().close();
    await p.context().close();
  }

  // --- 5: report listing flow
  {
    const p = await newPage();
    await p.goto(`${BASE}/listing/lst-1/laporkan`);
    record('Report form: five reasons, optional detail and contact, labelled controls, demo notice', (await p.getByRole('radio').count()) === 5 && (await p.getByLabel('Keterangan (opsional)').count()) === 1 && (await p.getByLabel('Kontak kamu (opsional)').count()) === 1 && /Mode demo/.test(await p.locator('main').innerText()), '', 'P1');
    await shot(p, '14-report-form-390.png', p.locator('main'));
    const labels = (await p.locator('fieldset label').allInnerTexts()).map((t) => t.trim());
    record('Report form: reasons match the product policy', JSON.stringify(labels) === JSON.stringify(['Dugaan penipuan', 'Lokasi tidak sesuai', 'Sudah tidak tersedia', 'Harga menyesatkan', 'Konten tidak pantas atau penyalahgunaan']), labels.join(' | '), 'P1');
    const rt = await smallTargets(p);
    record('Touch targets on the report form are ~44px', rt.length === 0, rt.map((s) => `${s.t}:${s.h}`).join(', '), 'P2');
    const rv = await axeViolations(p);
    record('axe WCAG A/AA: report form', rv.length === 0, rv.join(', '), 'P2');
    // negative: submit with no reason (browser validation bypassed)
    await p.evaluate(() => document.querySelectorAll('[required]').forEach((e) => e.removeAttribute('required')));
    await p.getByRole('button', { name: 'Kirim laporan' }).click();
    await p.getByTestId('report-error').waitFor();
    record('Report negative: missing reason is rejected server-side with a clear message and nothing is hidden', (await p.getByTestId('report-error').innerText()) === 'Pilih alasan laporan.', '', 'P1');
    await p.goto(BASE);
    record('Report negative: the listing is still visible after a rejected report', (await idsOnPage(p)).includes('lst-1'), '', 'P1');
    // negative: over-long detail and contact
    await p.goto(`${BASE}/listing/lst-1/laporkan`);
    await p.evaluate(() => { document.querySelectorAll('[required]').forEach((e) => e.removeAttribute('required')); document.querySelectorAll('[maxlength]').forEach((e) => e.removeAttribute('maxlength')); });
    await p.getByLabel('Dugaan penipuan').check();
    await p.getByLabel('Keterangan (opsional)').fill('x'.repeat(501));
    await p.getByRole('button', { name: 'Kirim laporan' }).click();
    await p.getByTestId('report-error').waitFor();
    record('Report negative: 501-character detail is rejected server-side', /maksimal 500/.test(await p.getByTestId('report-error').innerText()), '', 'P2');
    // negative: honeypot gets a normal-looking page and no effect
    await p.goto(`${BASE}/listing/lst-1/laporkan`);
    await p.getByLabel('Harga menyesatkan').check();
    await p.evaluate(() => { document.querySelector('input[name=website]').value = 'http://spam.test'; });
    await p.getByRole('button', { name: 'Kirim laporan' }).click();
    await p.waitForURL(/laporkan/);
    await p.goto(BASE);
    record('Report negative: a filled honeypot hides nothing and claims no success', (await idsOnPage(p)).includes('lst-1') && (await (await p.request.get(`${BASE}/listing/lst-1/laporkan`)).text()).indexOf('report-confirmation') === -1, '', 'P2');
    // F3: a confirmation URL must not claim a report that was never filed
    const ghost = await (await p.request.get(`${BASE}/listing/lst-1/laporkan?status=ok`)).text();
    record('F3: ?status=ok for a listing this visitor never reported shows no confirmation and no "disembunyikan" claim', !/report-confirmation|Laporan diterima|disembunyikan dari hasil/.test(ghost) && /Kirim laporan/.test(ghost), '', 'P2');
    // negative: forged ids cannot report or probe locked / unknown listings
    await p.goto(`${BASE}/listing/lst-3/laporkan`);
    await p.getByLabel('Lokasi tidak sesuai').check();
    await p.evaluate(() => { document.querySelector('input[name=listing_id]').value = 'lst-9'; });
    await p.getByRole('button', { name: 'Kirim laporan' }).click();
    await p.waitForURL((u) => u.pathname === '/');
    await p.goto(`${BASE}/listing/lst-3/laporkan`);
    await p.getByLabel('Lokasi tidak sesuai').check();
    await p.evaluate(() => { document.querySelector('input[name=listing_id]').value = 'lst-1; DROP TABLE'; });
    await p.getByRole('button', { name: 'Kirim laporan' }).click();
    await p.waitForURL((u) => u.pathname === '/');
    const probe = await (await browser.newContext()).newPage();
    await probe.context().addCookies([CONSENT]);
    record('Report negative: locked, unknown, and malformed listing ids are bounced without effect', (await idsOnPage(p)).join() === 'lst-1,lst-2,lst-3' && (await (await probe.request.get(`${BASE}/listing/lst-9/laporkan`)).status()) === 404 && (await (await probe.request.get(`${BASE}/listing/lst-77/laporkan`)).status()) === 404 && (await (await probe.request.get(`${BASE}/listing/not-an-id/laporkan`)).status()) === 404, '', 'P0');
    // happy path: valid report hides the listing at once for this visitor
    await p.goto(`${BASE}/listing/lst-1/laporkan`);
    await p.getByLabel('Dugaan penipuan').check();
    await p.getByLabel('Keterangan (opsional)').fill('Foto sama dengan iklan lain.');
    await p.getByRole('button', { name: 'Kirim laporan' }).click();
    await p.getByTestId('report-confirmation').waitFor();
    const conf = await p.locator('main').innerText();
    record('Report happy path: confirmation says the listing is hidden and is honest that the demo sends nothing', /disembunyikan dari hasil pencarianmu/.test(conf) && /tidak dikirim atau disimpan di server/.test(conf), '', 'P1');
    await p.goto(BASE);
    const afterIds = await idsOnPage(p);
    record('Report happy path: the reported listing leaves the results immediately; the 3-of-5 rule re-applies to the remaining four', afterIds.join() === 'lst-2,lst-3,lst-9' && /1 listing lainnya terkunci/.test(await p.getByTestId('listing-gate').innerText()), afterIds.join(), 'P1');
    record('Report happy path: its direct URL and report page now 404 for this visitor', (await p.request.get(`${BASE}/listing/lst-1`)).status() === 404 && (await p.request.get(`${BASE}/listing/lst-1/laporkan`)).status() === 404, '', 'P1');
    record('Report happy path: reporting again (confirmation URL replay) is idempotent', (await p.goto(`${BASE}/listing/lst-1/laporkan?status=ok`)).status() === 200 && (await p.getByTestId('report-confirmation').count()) === 1, '', 'P2');
    const cv = await axeViolations(p);
    record('axe WCAG A/AA: report confirmation', cv.length === 0, cv.join(', '), 'P2');
    await probe.context().close();
    await p.context().close();
  }

  // --- 7: expanded filters and sorting (anonymous = first three listings; signed in = all five)
  {
    const p = await newPage();
    await p.goto(BASE);
    const panel = p.locator('details.filters');
    record('Filters: the panel is collapsed by default and opens by keyboard', !(await panel.evaluate((d) => d.open)), '', 'P2');
    await p.getByText('Filter & urutkan').focus();
    await p.keyboard.press('Enter');
    await shot(p, '13-filter-panel-390.png', panel);
    record('Filters: every control has a visible label (price, facilities, availability, sort) and there is no role control', (await p.getByLabel('Harga per bulan').count()) === 1 && (await p.getByLabel('Pemasang iklan').count()) === 0 && (await p.getByLabel('Urutkan', { exact: true }).count()) === 1 && (await p.getByLabel('WiFi').count()) === 1 && (await p.getByLabel('Hanya yang masih tersedia').count()) === 1 && !/Pemilik dan agen/.test(await p.locator('details.filters').innerText()), '', 'P1');
    await p.getByLabel('Harga per bulan').selectOption('1to2');
    await p.getByRole('button', { name: 'Terapkan' }).click();
    await p.waitForURL(/price=1to2/);
    record('Filters: the price band is applied to the allowed set', (await idsOnPage(p)).join() === 'lst-1,lst-2,lst-3', '', 'P1');
    record('Filters: the open panel shows the active-filter count and keeps the choice', /Filter & urutkan \(1\)/.test(await p.locator('details.filters summary').innerText()) && (await p.getByLabel('Harga per bulan').inputValue()) === '1to2' && (await p.locator('details.filters').evaluate((d) => d.open)), '', 'P2');
    await p.goto(`${BASE}/?role=broker`);
    record('Role filter removed: a leftover ?role= parameter is ignored (no filtering, no active-filter badge)', (await idsOnPage(p)).join() === 'lst-1,lst-2,lst-3' && !(await p.locator('details.filters').evaluate((d) => d.open)), '', 'P1');
    await p.goto(`${BASE}/?fac=wifi`);
    record('Filters: facility WiFi', (await idsOnPage(p)).join() === 'lst-1,lst-3', '', 'P1');
    await p.goto(`${BASE}/?fac=wifi&fac=ac`);
    record('Filters: facilities combine with AND (WiFi + AC)', (await idsOnPage(p)).join() === 'lst-1', '', 'P1');
    await p.goto(`${BASE}/?avail=1`);
    record('Filters: "masih tersedia" excludes unknown and unavailable listings', (await idsOnPage(p)).join() === 'lst-1,lst-3', '', 'P1');
    await p.goto(`${BASE}/?price=1to2`);
    record('Filters: price band 1–2 jt compares yearly kontrakan on a monthly basis', (await idsOnPage(p)).join() === 'lst-1,lst-2,lst-3', '', 'P1');
    await p.goto(`${BASE}/?price=lt1`);
    record('Filters: no match shows the empty state, the gate stays, and a reset link works', (await p.locator('.empty').isVisible()) && (await p.getByTestId('listing-gate').count()) === 1, '', 'P1');
    await p.getByRole('link', { name: 'Hapus pencarian' }).click();
    await p.waitForURL((u) => !u.search);
    record('Filters: reset restores the three allowed listings', (await idsOnPage(p)).length === 3, '', 'P2');
    await p.goto(`${BASE}/?sort=price_desc`);
    record('Sort: highest price first (monthly basis)', (await idsOnPage(p)).join() === 'lst-2,lst-1,lst-3', '', 'P1');
    await p.goto(`${BASE}/?sort=price_asc`);
    record('Sort: lowest price first', (await idsOnPage(p)).join() === 'lst-3,lst-1,lst-2', '', 'P1');
    await p.goto(`${BASE}/?sort=recent`);
    record('Sort: most recently confirmed first', (await idsOnPage(p)).join() === 'lst-1,lst-2,lst-3', '', 'P1');
    await p.goto(`${BASE}/?price=bogus&sort=bogus&role=admin&fac=bogus&avail=9`);
    record('Filters negative: invalid parameter values are ignored, not errors', (await idsOnPage(p)).length === 3 && !(await p.locator('details.filters').evaluate((d) => d.open)), '', 'P1');
    await p.goto(`${BASE}/?q=${encodeURIComponent('<script>alert(1)</script>')}`);
    record('Filters negative: a script-like search string is rendered as text and finds nothing', (await p.locator('.empty').isVisible()) && (await p.locator('#q').inputValue()) === '<script>alert(1)</script>', '', 'P0');
    await p.goto(`${BASE}/?q=${'a'.repeat(300)}`);
    record('Filters edge: a 300-character query is truncated safely', (await p.locator('#q').inputValue()).length === 100, '', 'P2');
    await p.goto(`${BASE}/?q=depok&fac=wifi&sort=price_asc`);
    await p.fill('#q', 'sleman');
    await p.click('.search button');
    await p.waitForURL(/q=sleman/);
    record('Filters: a new search keeps the active filters and sort', /fac=wifi/.test(p.url()) && /sort=price_asc/.test(p.url()), p.url(), 'P1');
    record('Filters negative: locked listings never appear through price/sort/search/leftover params for anonymous visitors', await (async () => {
      let ok = true;
      for (const qs of ['role=broker&sort=price_asc', 'price=lt1', 'q=cempaka', 'q=mawar', 'avail=1&sort=recent', 'fac=parkir']) {
        await p.goto(`${BASE}/?${qs}`);
        const html = await p.content();
        ok &&= !html.includes('Cempaka') && !html.includes('Mawar') && !(await idsOnPage(p)).some((i) => i === 'lst-9' || i === 'lst-10');
      }
      return ok;
    })(), '', 'P0');
    const fv = await axeViolations(p);
    record('axe WCAG A/AA: homepage with filters active', fv.length === 0, fv.join(', '), 'P2');
    await p.context().close();
    // signed in: all five
    const u = await newPage();
    await signIn(u);
    await u.goto(`${BASE}/?sort=price_asc`);
    record('Sort (signed in): all five listings by price ascending', (await idsOnPage(u)).join() === 'lst-9,lst-3,lst-1,lst-2,lst-10', '', 'P1');
    await u.goto(`${BASE}/?avail=1&sort=recent`);
    record('Filters (signed in): availability + recency over all five', (await idsOnPage(u)).join() === 'lst-9,lst-1,lst-3', (await idsOnPage(u)).join(), 'P1');
    await u.goto(`${BASE}/?fac=parkir`);
    record('Filters (signed in): parking reaches the previously locked listing', (await idsOnPage(u)).join() === 'lst-2,lst-10', '', 'P1');
    await u.goto(`${BASE}/listing/lst-10`);
    record('Detail (signed in): "Tidak tersedia" and undisclosed broker fee are shown plainly', /Tidak tersedia/.test(await u.getByTestId('status-panel').innerText()) && /belum dicantumkan/.test(await u.getByTestId('fee-note').innerText()), '', 'P1');
    await u.context().close();
  }

  // --- 3: optional, one-shot geolocation; manual area search always works
  {
    const mk = async (opts) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...opts });
      await ctx.addCookies([CONSENT]);
      await ctx.addInitScript(() => {
        window.__geo = { once: 0, watch: 0 };
        const g = navigator.geolocation;
        if (g) {
          const gcp = g.getCurrentPosition.bind(g);
          g.getCurrentPosition = (...a) => { window.__geo.once++; return gcp(...a); };
          g.watchPosition = () => { window.__geo.watch++; throw new Error('watchPosition must not be used'); };
        }
      });
      return ctx;
    };
    const ctx = await mk({ geolocation: { latitude: -7.7956, longitude: 110.3695 }, permissions: ['geolocation'] });
    const p = await ctx.newPage();
    const sent = [];
    p.on('request', (r) => sent.push(r.url() + (r.postData() ?? '')));
    await p.goto(BASE);
    record('Location: nothing asks for location on load', (await p.evaluate(() => window.__geo.once)) === 0 && (await idsOnPage(p)).length === 3, '', 'P1');
    await p.getByRole('button', { name: 'Urutkan dari lokasi saya' }).click();
    await p.getByRole('button', { name: 'Hapus urutan terdekat' }).waitFor();
    const labels = await p.getByTestId('distance').allInnerTexts();
    const kms = labels.map((t) => Number(t.match(/([\d,]+) km/)[1].replace(',', '.')));
    const order = await idsOnPage(p);
    record('Location: one tap sorts the allowed listings nearest-first and labels each distance as approximate', labels.length === 3 && kms.every((k, i) => i === 0 || k >= kms[i - 1]) && /terdekat \(perkiraan\)/.test(await p.locator('.nearby__status').innerText()), `${order.join()} ${kms.join(',')}`, 'P1');
    record('Location: exactly one getCurrentPosition call, never watchPosition', (await p.evaluate(() => window.__geo.once)) === 1 && (await p.evaluate(() => window.__geo.watch)) === 0, '', 'P1');
    record('Location: the coordinates are never sent anywhere (no request carries them)', !sent.some((s) => /-7\.79|110\.36/.test(s)), '', 'P0');
    await p.getByRole('button', { name: 'Hapus urutan terdekat' }).click();
    record('Location: clearing restores the default order and removes distances', (await idsOnPage(p)).join() === 'lst-1,lst-2,lst-3' && (await p.getByTestId('distance').count()) === 0, '', 'P2');
    await ctx.close();

    const deniedCtx = await mk({});
    const d = await deniedCtx.newPage();
    await d.goto(BASE);
    await d.getByRole('button', { name: 'Urutkan dari lokasi saya' }).click();
    await d.waitForFunction(() => /ditolak/.test(document.querySelector('.nearby__status')?.textContent ?? ''));
    await d.fill('#q', 'depok');
    await d.click('.search button');
    await d.waitForURL(/q=depok/);
    record('Location denied: a clear message, and browsing plus manual area search still work', (await idsOnPage(d)).join() === 'lst-2', '', 'P0');
    await deniedCtx.close();

    const noGeoCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await noGeoCtx.addCookies([CONSENT]);
    await noGeoCtx.addInitScript(() => { Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true }); });
    const n = await noGeoCtx.newPage();
    await n.goto(BASE);
    await n.getByRole('button', { name: 'Urutkan dari lokasi saya' }).click();
    record('Location unsupported: a clear message and the list is unaffected', /tidak mendukung lokasi/.test(await n.locator('.nearby__status').innerText()) && (await idsOnPage(n)).length === 3, '', 'P1');
    await noGeoCtx.close();
  }

  // --- 9: concise consent modal v2, consent versioning, funnel events
  {
    const m = await newPage({ consent: false, track: false });
    await m.goto(BASE);
    const items = (await m.locator('.modal__list li').allInnerTexts()).map((t) => t.trim());
    record('Modal v2: exactly the three approved safety actions', JSON.stringify(items) === JSON.stringify(['Survei langsung ke lokasi.', 'Jangan transfer sebelum melihat langsung.', 'Hubungi hanya lewat kontak yang tertera di Ngekost Jogja.']), items.join(' | '), 'P1');
    const visibleWords = await m.evaluate(() => { const c = document.querySelector('.modal').cloneNode(true); c.querySelectorAll('details').forEach((d) => d.querySelectorAll(':scope > :not(summary)').forEach((n) => n.remove())); return c.textContent.trim().split(/\s+/).length; });
    record('Modal v2 is concise: at most 55 visible words before the guide is expanded', visibleWords <= 55, `${visibleWords} words`, 'P2');
    record('Modal v2: the checkbox label is explicit and unchecked', (await m.getByLabel('Saya paham dan akan verifikasi langsung sebelum membayar.').isChecked()) === false, '', 'P1');
    await m.context().close();
    const stale = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await stale.addCookies([{ name: CONSENT.name, value: '2026-10-v1', url: BASE }]);
    const sp = await stale.newPage();
    await sp.goto(BASE);
    record('Consent versioning: a consent given to the old wording (v1) does not bypass the new modal', await modalVisible(sp), '', 'P0');
    await sp.goto(`${BASE}/listing/lst-1`);
    record('Consent versioning: old consent does not unlock direct listing URLs either', (await modalVisible(sp)) && !(await sp.content()).includes('Timoho'), '', 'P0');
    await stale.close();
    const forged = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await forged.addCookies([{ name: CONSENT.name, value: 'yes', url: BASE }]);
    const fp = await forged.newPage();
    await fp.goto(BASE);
    record('Consent negative: a forged consent cookie value does not bypass the modal', await modalVisible(fp), '', 'P0');
    await forged.close();

    // client events (intercepted) — shown, abandoned, and Do-Not-Track
    const ec = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const posted = [];
    await ec.route('**/api/events', async (route) => { posted.push(route.request().postDataJSON()); await route.fulfill({ status: 204 }); });
    const ep = await ec.newPage();
    await ep.goto(BASE);
    await ep.waitForFunction(() => document.querySelector('[role=dialog]'));
    await ep.waitForTimeout(400);
    record('Events: opening the modal records consent_shown with a coarse viewport bucket and nothing else', posted.some((e) => e.event === 'consent_shown' && e.viewport === 'sm' && Object.keys(e).length === 2), JSON.stringify(posted), 'P2');
    await ec.close();
    // abandonment is sent as a beacon while the page unloads, so it is verified on the server log rather than by interception
    const abBefore = loggedEvents().length;
    const abCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const abPage = await abCtx.newPage();
    await abPage.goto(BASE);
    await abPage.waitForFunction(() => document.querySelector('[role=dialog]'));
    await abPage.waitForTimeout(400);
    await abPage.goto('about:blank');
    await abPage.waitForTimeout(800);
    const abNames = loggedEvents().slice(abBefore).map((e) => e.name);
    record('Events: leaving the modal without consenting records consent_abandoned (server log)', abNames.includes('consent_shown') && abNames.includes('consent_abandoned') && !abNames.includes('consent_accepted'), abNames.join(','), 'P2');
    await abCtx.close();
    const dnt = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const dntPosted = [];
    await dnt.route('**/api/events', async (route) => { dntPosted.push(route.request().postDataJSON()); await route.fulfill({ status: 204 }); });
    await dnt.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }));
    const dp = await dnt.newPage();
    await dp.goto(BASE);
    await dp.waitForTimeout(400);
    await dp.goto('about:blank');
    await dp.waitForTimeout(300);
    record('Events negative: with Do Not Track on, no event is sent', dntPosted.length === 0, JSON.stringify(dntPosted), 'P1');
    await dnt.close();

    // server-side events: accepted, gate_shown, signup_started, signup_completed
    const before = loggedEvents().length;
    const fc = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const fpg = await fc.newPage();
    await fpg.goto(BASE);
    await fpg.getByRole('checkbox').check();
    await fpg.getByRole('button', { name: 'Saya paham, lanjut melihat listing' }).click();
    await fpg.getByTestId('listing-gate').waitFor();
    await fpg.waitForTimeout(600);
    await fpg.goto(`${BASE}/masuk`);
    await fpg.waitForTimeout(400);
    await fpg.getByRole('button', { name: 'Masuk / Daftar (demo)' }).click();
    await fpg.waitForFunction(() => document.querySelectorAll('.cards > li').length === 5);
    await fpg.waitForTimeout(300);
    const mine = loggedEvents().slice(before);
    const names = mine.map((e) => e.name);
    record('Events: the full funnel is logged server-side in order (shown, accepted, gate_shown, signup_started, signup_completed)', ['consent_shown', 'consent_accepted', 'gate_shown', 'signup_started', 'signup_completed'].every((n) => names.includes(n)) && names.indexOf('consent_accepted') > names.indexOf('consent_shown') && names.indexOf('signup_completed') > names.indexOf('signup_started'), names.join(','), 'P2');
    record('Events: consent events carry only a viewport bucket; no ids, cookies, or listing data are logged', mine.every((e) => Object.keys(e).every((k) => ['type', 'name', 'viewport', 'at'].includes(k))) && mine.find((e) => e.name === 'consent_accepted')?.viewport === 'sm', JSON.stringify(mine[0]), 'P1');
    await fc.close();
    const api = (init, body) => fetch(`${BASE}/api/events`, { method: 'POST', ...init, body });
    record('Events API negative: unknown event 400, malformed JSON 400, oversized body 413, GET 405', (await api({}, JSON.stringify({ event: 'page_view' }))).status === 400 && (await api({}, '{nope')).status === 400 && (await api({}, JSON.stringify({ event: 'consent_shown', pad: 'x'.repeat(300) }))).status === 413 && (await fetch(`${BASE}/api/events`)).status === 405 && (await api({}, JSON.stringify({ event: 'gate_shown' }))).status === 204, '', 'P1');
  }

  // ===== Findings from independent QA (F1–F6) and the Product Owner's role/fee decision =====
  {
    // Role/fee: signed-in, all five listings
    const u = await newPage();
    await signIn(u);
    const c9 = u.locator('[data-listing-id="lst-9"]'), c10 = u.locator('[data-listing-id="lst-10"]');
    record('Role/fee: an agen listing with no broker fee (lst-9) shows no role badge and no fee line', (await c9.locator('.tag--role').count()) === 0 && (await c9.locator('.card__fee').count()) === 0, '', 'P1');
    record('Role/fee: an agen listing whose fee is not stated (lst-10) shows "Agen" and "belum dicantumkan"', (await c10.locator('.tag--role').innerText()) === 'Agen' && /belum dicantumkan/.test(await c10.locator('.card__fee').innerText()), '', 'P1');
    await u.goto(`${BASE}/listing/lst-9`);
    record('Role/fee: the detail of a zero-fee agen listing shows no role badge, no fee note, and no "Agen" label', (await u.getByTestId('fee-note').count()) === 0 && (await u.locator('.tag--role').count()) === 0 && !/\bAgen\b|agen\b/.test(await u.locator('main > .card__meta, main h1').allInnerTexts().then((t) => t.join(' '))), '', 'P1');
    await u.goto(`${BASE}/listing/lst-10`);
    record('Role/fee: the detail of an agen listing with an unstated fee shows the role and the fee note', (await u.locator('.tag--role').innerText()) === 'Agen' && /belum dicantumkan/.test(await u.getByTestId('fee-note').innerText()), '', 'P1');
    await u.context().close();

    // F1: dummy gallery is honest about being sample crops
    const g = await newPage();
    await g.goto(`${BASE}/listing/lst-1`);
    record('F1: the detail gallery says the sample photos are crops of one example image and that real listings need three different photos', /potongan dari gambar contoh yang sama/.test(await g.getByTestId('gallery-note').innerText()) && /tiga foto yang berbeda/.test(await g.getByTestId('gallery-note').innerText()), '', 'P2');

    // F2: consent modal without JavaScript explains itself
    const nj = await newPage({ consent: false, js: false, track: false });
    await nj.goto(BASE);
    record('F2: with JavaScript disabled the consent modal explains that JavaScript is needed (and the action stays disabled)', /Aktifkan JavaScript/.test(await nj.locator('.modal').innerText()) && (await nj.getByRole('button', { name: 'Saya paham, lanjut melihat listing' }).isDisabled()), '', 'P3');
    await nj.context().close();
    const wj = await newPage({ consent: false, track: false });
    await wj.goto(BASE);
    record('F2: with JavaScript enabled the no-JavaScript notice is not shown', !(await wj.locator('.modal').innerText()).includes('Aktifkan JavaScript'), '', 'P3');
    await wj.context().close();

    // F4/F5: heading order and landmarks (axe best-practice rules are outside the WCAG tag sets used elsewhere)
    const bp = async (p) => {
      await p.evaluate(axeSource);
      return (await p.evaluate(() => axe.run(document, { runOnly: { type: 'rule', values: ['heading-order', 'landmark-one-main', 'region', 'page-has-heading-one', 'landmark-unique'] } }))).violations.map((v) => `${v.id}(${v.impact}, ${v.nodes.length})`);
    };
    const bpPage = await newPage({ track: false });
    for (const path of ['/', '/listing/lst-1', '/listing/lst-9', '/listing/lst-999', '/masuk', '/listing/lst-1/laporkan']) {
      await bpPage.goto(BASE + path);
      const v = await bp(bpPage);
      record(`F4/F5: heading order and landmarks are valid on ${path}`, v.length === 0, v.join(', '), 'P3');
    }
    const nf = await bpPage.goto(`${BASE}/listing/lst-999`);
    record('F5: the 404 page keeps status 404, has a main landmark, an h1, and a way home', nf.status() === 404 && (await bpPage.locator('main h1').count()) === 1 && (await bpPage.getByRole('link', { name: /beranda|kembali/i }).count()) >= 1, '', 'P3');
    await bpPage.context().close();

    // F6: the location control only exists when JavaScript can run it
    const nj2 = await newPage({ js: false, track: false });
    await nj2.goto(BASE);
    record('F6: with JavaScript disabled there is no inert "Urutkan dari lokasi saya" button', (await nj2.getByRole('button', { name: 'Urutkan dari lokasi saya' }).count()) === 0 && (await idsOnPage(nj2)).length === 3, '', 'P3');
    await nj2.context().close();
    const wj2 = await newPage({ track: false });
    await wj2.goto(BASE);
    await wj2.getByRole('button', { name: 'Urutkan dari lokasi saya' }).waitFor();
    record('F6: with JavaScript enabled the location control appears', true, '', 'P3');
    await wj2.context().close();
  }

  // ===== Card layout regression: stress content at every required viewport =====
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    const p = await newPage({ width: w, height: h });
    await p.goto(`${BASE}/qa/cards`);
    const stress = await cardIntegrity(p);
    record(`Card layout: no clipping or overflow at ${w}px (10 stress cards: long title/word/address, no facilities, no evidence, unknown/unavailable, broker fee, yearly Rp 1.25 miliar)`, (await p.locator('.card').count()) === 10 && stress.length === 0, stress.slice(0, 4).join('; '), 'P1');
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
  recordBlocked('Independent QA run separate from the implementer', 'Pending for the Trust and Discovery iteration: this report is generated by the implementing agent. The earlier independent QA covered PR #2 only, not these changes.', 'P1');

  // ===== Responsive overflow (consented) =====
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
    const p = await newPage({ width: w, height: h });
    for (const path of ['/', '/listing/lst-1', '/listing/lst-2', '/listing/lst-2/laporkan', '/?price=1to2&fac=wifi&sort=price_asc', '/qa/detail']) {
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
const md = `# Design QA — Option 3, iteration 2, and Trust and Discovery

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
