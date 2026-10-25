import { describe, expect, it, vi } from 'vitest';
import { buildDummyData } from '@/data/dummy-listings';
import { listingPhoto } from '@/components/listings/photos';
import { EVENT_NAMES, isEventName, isViewport, logEvent, viewportBucket } from '@/lib/analytics/events';
import { AccessError, DevDatabase } from '@/lib/data/dev-database';
import { getPreviewDetail, listPreviewCards, listPreviewListings } from '@/lib/data/preview';
import { toPublicListing } from '@/lib/data/rules';
import { TRUST_DISCLAIMER, buildTrustEvidence } from '@/lib/data/trust';
import { AVAILABILITY_LABEL, AVAILABILITY_SHORT, ROLE_LABEL, brokerFeeNote, compactLocation, confirmedLabel, confirmedShort, isStillAvailable } from '@/lib/format';
import { distanceMeters, googleMapsLink, osmEmbedUrl, osmLink } from '@/lib/location/geo';
import { MAX_OFFSET_M, MIN_OFFSET_M, approximateLocation } from '@/lib/location/approximate';
import { MAX_REPORTED, addReportedId, isListingId, parseReportedIds } from '@/lib/reporting/reported';
import { MAX_CONTACT, MAX_DETAIL, validateReport } from '@/lib/reporting/validate';
import { PHOTO_RULES, PHOTO_SLOTS, validatePhotoSet } from '@/lib/validation/photos';
import { buildSurveyMessage, whatsappLink } from '@/lib/whatsapp/survey';

const NOW = new Date('2026-10-25T00:00:00.000Z');
const form = (o: Record<string, string>) => ({ get: (k: string) => (k in o ? o[k] : null) });

describe('approximate location (never expose exact coordinates)', () => {
  const exact = { latitude: -7.8014, longitude: 110.3896 };

  it('places the point 300–500 m away for many ids, with several secrets', () => {
    for (const secret of ['a', 'b', 'prod-secret-123']) {
      for (let i = 0; i < 300; i++) {
        const p = approximateLocation(`lst-${i}`, exact, secret);
        const d = distanceMeters(exact, p);
        expect(d).toBeGreaterThanOrEqual(MIN_OFFSET_M);
        expect(d).toBeLessThanOrEqual(MAX_OFFSET_M);
      }
    }
  });

  it('is deterministic per id and secret, and differs across ids and secrets', () => {
    const a = approximateLocation('lst-1', exact, 's1');
    expect(approximateLocation('lst-1', exact, 's1')).toEqual(a);
    expect(approximateLocation('lst-2', exact, 's1')).not.toEqual(a);
    expect(approximateLocation('lst-1', exact, 's2')).not.toEqual(a);
  });

  it('never returns the exact point and rounds to 4 decimals', () => {
    const p = approximateLocation('lst-1', exact, 's1');
    expect(p).not.toEqual(exact);
    expect(Number(p.latitude.toFixed(4))).toBe(p.latitude);
    expect(Number(p.longitude.toFixed(4))).toBe(p.longitude);
  });

  it('keeps the public projection free of exact coordinates and the private address', () => {
    const data = buildDummyData(NOW);
    for (const l of data.listings) {
      const json = JSON.stringify(toPublicListing(l));
      expect(json).not.toContain(String(l.map_latitude));
      expect(json).not.toContain(String(l.map_longitude));
      expect(json).not.toContain(l.address);
      expect(json).not.toContain('map_latitude');
    }
  });

  it('keeps cards and detail free of exact coordinates, address, owner, and source', () => {
    const data = buildDummyData(NOW);
    const blobs = [JSON.stringify(listPreviewCards(NOW)), JSON.stringify(listPreviewListings(NOW)), ...data.listings.map((l) => JSON.stringify(getPreviewDetail(l.id, NOW) ?? {}))].join('\n');
    for (const l of data.listings) {
      expect(blobs).not.toContain(String(l.map_latitude));
      expect(blobs).not.toContain(String(l.map_longitude));
      expect(blobs).not.toContain(l.address);
    }
    expect(blobs).not.toContain('owner_id');
    expect(blobs).not.toContain('"source"');
  });

  it('builds map links only from the approximate point', () => {
    const p = approximateLocation('lst-1', exact, 's1');
    for (const url of [osmEmbedUrl(p), osmLink(p), googleMapsLink(p)]) {
      expect(url).not.toContain(String(exact.latitude));
      expect(url).not.toContain(String(exact.longitude));
      expect(url).toContain(p.latitude.toFixed(4).replace('-', ''));
    }
    expect(osmEmbedUrl(p)).toMatch(/^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?/);
  });
});

describe('trust evidence', () => {
  const account = { email_verified_at: '2026-01-01T00:00:00Z' };
  const base = { imageCount: 3, account, contact_reachability_status: 'reachable' as const, verification_status: 'verified' as const, permission_status: 'granted' as const };

  it('marks every check ok only when the stored record supports it', () => {
    expect(buildTrustEvidence(base).every((i) => i.ok)).toBe(true);
  });

  it.each([
    ['photos', { imageCount: 2 }],
    ['whatsapp', { contact_reachability_status: 'unverified' as const }],
    ['whatsapp', { contact_reachability_status: 'failed' as const }],
    ['email', { account: { email_verified_at: null } }],
    ['admin', { verification_status: 'unverified' as const }],
    ['permission', { permission_status: 'pending' as const }],
  ])('does not claim %s when the record does not support it', (key, patch) => {
    const items = buildTrustEvidence({ ...base, ...patch });
    expect(items.find((i) => i.key === key)?.ok).toBe(false);
    expect(items.filter((i) => i.key !== key).every((i) => i.ok)).toBe(true);
  });

  it('handles a missing account without throwing', () => {
    expect(buildTrustEvidence({ ...base, account: undefined }).find((i) => i.key === 'email')?.ok).toBe(false);
  });

  it('uses the approved label and a non-guarantee disclaimer', () => {
    expect(buildTrustEvidence(base).find((i) => i.key === 'admin')?.short).toBe('Ditinjau admin');
    expect(TRUST_DISCLAIMER).toMatch(/bukan jaminan/);
  });

  it('every approved dummy listing has full evidence on cards', () => {
    for (const card of listPreviewCards(NOW)) expect(card.evidence.every((i) => i.ok)).toBe(true);
  });
});

describe('freshness, availability, role and broker fee', () => {
  it.each([
    [null, 'Belum dikonfirmasi'],
    ['2026-10-25T00:00:00Z', 'Dikonfirmasi hari ini'],
    ['2026-10-24T00:00:00Z', 'Dikonfirmasi kemarin'],
    ['2026-10-20T00:00:00Z', 'Dikonfirmasi 5 hari lalu'],
    ['2026-09-25T00:00:00Z', 'Dikonfirmasi 30 hari lalu'],
    ['2026-09-24T00:00:00Z', 'Dikonfirmasi 1 bulan lalu'],
    ['2026-08-10T00:00:00Z', 'Dikonfirmasi 2 bulan lalu'],
    ['2026-11-01T00:00:00Z', 'Dikonfirmasi hari ini'], // future timestamps never go negative
  ])('confirmedLabel(%s)', (iso, expected) => expect(confirmedLabel(iso, NOW)).toBe(expected));

  it('never lets "unknown" or "unavailable" read as available', () => {
    expect(AVAILABILITY_LABEL.unknown).toBe('Ketersediaan belum dikonfirmasi');
    expect(AVAILABILITY_LABEL.unknown).not.toMatch(/^Tersedia/);
    expect(isStillAvailable('unknown')).toBe(false);
    expect(isStillAvailable('unavailable')).toBe(false);
    expect(isStillAvailable('available')).toBe(true);
    expect(isStillAvailable('limited')).toBe(true);
  });

  it('labels the role honestly', () => {
    expect(ROLE_LABEL).toEqual({ owner: 'Pemilik', broker: 'Agen' });
  });

  it('shows a broker-fee note only when there is a fee or the fee is unknown; "no fee" says nothing', () => {
    expect(brokerFeeNote('owner', 'none', null)).toBeNull();
    expect(brokerFeeNote('owner', 'disclosed', 1_000_000)).toBeNull(); // owners never carry a broker fee note
    expect(brokerFeeNote('broker', 'none', null)).toBeNull();
    const disclosed = brokerFeeNote('broker', 'disclosed', 1500000);
    expect(disclosed?.text).toContain('1.500.000');
    expect(disclosed?.text).toMatch(/tidak memungut/);
    expect(brokerFeeNote('broker', 'undisclosed', null)?.text).toMatch(/belum dicantumkan/);
    expect(brokerFeeNote('broker', 'disclosed', null)?.text).toMatch(/belum dicantumkan/); // amount missing never reads as free
  });
});

describe('photo guidance and validation', () => {
  const ok = [{ storage_path: 'a.jpg' }, { storage_path: 'b.jpg' }, { storage_path: 'c.jpg' }];

  it('accepts three distinct photos', () => expect(validatePhotoSet(ok)).toEqual({ ok: true, errors: [] }));
  it('requires exactly three', () => {
    expect(validatePhotoSet(ok.slice(0, 2)).ok).toBe(false);
    expect(validatePhotoSet([...ok, { storage_path: 'd.jpg' }]).ok).toBe(false);
    expect(validatePhotoSet([]).ok).toBe(false);
  });
  it('rejects the same file and identical content', () => {
    expect(validatePhotoSet([ok[0], ok[0], ok[1]]).errors.join()).toMatch(/sama/);
    expect(validatePhotoSet(ok.map((p) => ({ ...p, sha256: 'x' }))).errors.join()).toMatch(/identik/);
  });
  it('rejects disallowed types and tiny images', () => {
    expect(validatePhotoSet([{ ...ok[0], mime: 'image/gif' }, ok[1], ok[2]]).ok).toBe(false);
    expect(validatePhotoSet([{ ...ok[0], width: 300, height: 900 }, ok[1], ok[2]]).ok).toBe(false);
    expect(validatePhotoSet([{ ...ok[0], width: 800, height: 600, mime: 'image/webp' }, ok[1], ok[2]]).ok).toBe(true);
  });
  it('guidance covers three distinct slots and the anti-reuse rules', () => {
    expect(PHOTO_SLOTS).toHaveLength(3);
    expect(new Set(PHOTO_SLOTS.map((s) => s.title)).size).toBe(3);
    expect(PHOTO_RULES.join(' ')).toMatch(/berbeda/);
  });
  it('dummy listings show three different image files per type', () => {
    for (const t of ['kost', 'kontrakan'] as const) {
      expect(new Set([1, 2, 3].map((n) => listingPhoto(t, n as 1 | 2 | 3).src)).size).toBe(3);
    }
    for (const l of buildDummyData(NOW).listings) {
      const paths = buildDummyData(NOW).images.filter((i) => i.listing_id === l.id).map((i) => i.storage_path);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });
});

describe('survey template', () => {
  const msg = buildSurveyMessage({ contactName: 'Bu Sari', title: 'Kost Puri Timoho', neighborhood: 'Timoho, Kec. Umbulharjo' });
  it('proposes a visit and states no payment beforehand', () => {
    expect(msg).toContain('Bu Sari');
    expect(msg).toContain('Kost Puri Timoho');
    expect(msg).toContain('Timoho, Kec. Umbulharjo');
    expect(msg).toMatch(/survei langsung/);
    expect(msg).toMatch(/belum akan membayar/);
  });
  it('never asks for or mentions amounts, deposits, or bank details', () => {
    expect(msg).not.toMatch(/rp\s?\d|deposit|dp\b|rekening|booking/i);
  });
  it('builds a wa.me link with digits only and an encoded text', () => {
    const link = whatsappLink('+62-800-0000-0101', msg);
    expect(link.startsWith('https://wa.me/6280000000101?text=')).toBe(true);
    expect(link).toContain(encodeURIComponent('Kost Puri Timoho'));
    expect(whatsappLink('+62 800 0000 0101')).toBe('https://wa.me/6280000000101');
  });
});

describe('report validation and the reported-listings cookie', () => {
  it('accepts a valid report and trims input', () => {
    expect(validateReport(form({ reason: 'suspected_scam', detail: '  foto sama  ', contact: ' a@b.test ' }))).toEqual({ ok: true, input: { reason: 'suspected_scam', detail: 'foto sama', contact: 'a@b.test' } });
    expect(validateReport(form({ reason: 'abuse' }))).toEqual({ ok: true, input: { reason: 'abuse', detail: null, contact: null } });
  });
  it.each(['suspected_scam', 'wrong_location', 'unavailable', 'misleading_price', 'abuse'])('accepts reason %s', (reason) => {
    expect(validateReport(form({ reason })).ok).toBe(true);
  });
  it('rejects unknown, missing, and injected reasons', () => {
    for (const reason of ['', 'spam', '<script>', "scam' OR 1=1"]) expect(validateReport(form({ reason }))).toEqual({ ok: false, code: 'reason' });
    expect(validateReport(form({}))).toEqual({ ok: false, code: 'reason' });
  });
  it('enforces length limits', () => {
    expect(validateReport(form({ reason: 'abuse', detail: 'x'.repeat(MAX_DETAIL) })).ok).toBe(true);
    expect(validateReport(form({ reason: 'abuse', detail: 'x'.repeat(MAX_DETAIL + 1) }))).toEqual({ ok: false, code: 'detail' });
    expect(validateReport(form({ reason: 'abuse', contact: 'x'.repeat(MAX_CONTACT + 1) }))).toEqual({ ok: false, code: 'contact' });
  });
  it('treats a filled honeypot as spam', () => {
    expect(validateReport(form({ reason: 'abuse', website: 'http://spam.test' }))).toEqual({ ok: false, code: 'spam' });
  });
  it('parses the cookie defensively and adds ids idempotently with a cap', () => {
    expect(parseReportedIds(undefined)).toEqual([]);
    expect(parseReportedIds('lst-1,evil,../x,lst-2,lst-1')).toEqual(['lst-1', 'lst-2']);
    expect(addReportedId('lst-1', 'lst-1')).toBe('lst-1');
    expect(addReportedId('lst-1', 'lst-2')).toBe('lst-1,lst-2');
    const many = Array.from({ length: MAX_REPORTED + 5 }, (_, i) => `lst-${i + 1}`).join(',');
    expect(parseReportedIds(many)).toHaveLength(MAX_REPORTED);
    expect(isListingId('lst-12')).toBe(true);
    expect(isListingId('lst-')).toBe(false);
    expect(isListingId('x')).toBe(false);
  });
  it('a reported listing disappears from the viewer results and its detail', () => {
    expect(listPreviewCards(NOW, ['lst-1']).map((c) => c.id)).not.toContain('lst-1');
    expect(getPreviewDetail('lst-1', NOW, ['lst-1'])).toBeUndefined();
    expect(getPreviewDetail('lst-1', NOW)).toBeDefined();
  });
});

describe('dev database report intake', () => {
  const fresh = () => {
    const db = new DevDatabase();
    db.seed(buildDummyData(NOW));
    return db;
  };
  const input = { reason: 'suspected_scam' as const, detail: 'foto sama', contact: null };

  it('hides an approved listing from public results immediately and records the report', () => {
    const db = fresh();
    expect(db.listPublicListings(NOW).map((l) => l.id)).toContain('lst-1');
    const r = db.createReport('lst-1', input, 'key-a', NOW);
    expect(r.created).toBe(true);
    expect(db.listPublicListings(NOW).map((l) => l.id)).not.toContain('lst-1');
    expect(db.listReports('lst-1').at(-1)).toMatchObject({ status: 'open', reason: 'suspected_scam', created_at: NOW.toISOString() });
  });
  it('is idempotent per reporter, listing and reason within 24 h', () => {
    const db = fresh();
    const first = db.createReport('lst-1', input, 'key-a', NOW);
    const again = db.createReport('lst-1', input, 'key-a', new Date(NOW.getTime() + 3_600_000));
    expect(again).toEqual({ id: first.id, created: false });
    expect(db.listReports('lst-1')).toHaveLength(1);
    expect(db.createReport('lst-1', input, 'key-b', NOW).created).toBe(true);
    expect(db.createReport('lst-1', { ...input, reason: 'abuse' }, 'key-a', NOW).created).toBe(true);
    expect(db.createReport('lst-1', input, 'key-a', new Date(NOW.getTime() + 25 * 3_600_000)).created).toBe(true);
  });
  it('does not change non-approved listings and rejects unknown ids', () => {
    const db = fresh();
    db.createReport('lst-5', input, 'k', NOW); // hidden
    expect(db.getSubmitterListing('acc-broker-1', 'lst-5')?.status).toBe('hidden');
    expect(() => db.createReport('lst-999', input, 'k', NOW)).toThrow(AccessError);
  });
  it('an admin can restore a reported listing, with an audit event', () => {
    const db = fresh();
    db.createReport('lst-1', input, 'k', NOW);
    expect(db.moderate('acc-admin-1', 'lst-1', 'restore', null, NOW).status).toBe('approved');
    expect(db.listPublicListings(NOW).map((l) => l.id)).toContain('lst-1');
    expect(db.listModerationEvents('lst-1').at(-1)).toMatchObject({ action: 'restore' });
  });
});

describe('funnel events', () => {
  it('only allows the six funnel events and coarse viewport buckets', () => {
    expect([...EVENT_NAMES]).toEqual(['consent_shown', 'consent_accepted', 'consent_abandoned', 'gate_shown', 'signup_started', 'signup_completed']);
    for (const bad of ['', 'page_view', 'consent_shown ', 'CONSENT_SHOWN', null, 1, {}]) expect(isEventName(bad)).toBe(false);
    expect(viewportBucket(320)).toBe('sm');
    expect(viewportBucket(639)).toBe('sm');
    expect(viewportBucket(768)).toBe('md');
    expect(viewportBucket(1440)).toBe('lg');
    expect(isViewport('xl')).toBe(false);
  });
  it('logs one JSON line with only the name, optional bucket, and time', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logEvent('consent_accepted', 'sm', NOW);
    logEvent('gate_shown', undefined, NOW);
    expect(JSON.parse(spy.mock.calls[0][0])).toEqual({ type: 'nk_event', name: 'consent_accepted', viewport: 'sm', at: NOW.toISOString() });
    expect(JSON.parse(spy.mock.calls[1][0])).toEqual({ type: 'nk_event', name: 'gate_shown', at: NOW.toISOString() });
    spy.mockRestore();
  });
});

describe('compact location for list cards', () => {
  it.each([
    ['Timoho, Kec. Umbulharjo, Kota Jogja', 'Kec. Umbulharjo, Kota Jogja'],
    ['Depok, Kec. Sleman, Kab. Sleman', 'Kec. Sleman, Kab. Sleman'],
    ['Terban, Kec. Gondokusuman, Kota Jogja', 'Kec. Gondokusuman, Kota Jogja'],
    ['Condongcatur, Kec. Depok, Kab. Sleman', 'Kec. Depok, Kab. Sleman'],
    ['Perumahan Contoh Asri Blok C, RT 04 RW 09, Kelurahan Contoh Lor, Kecamatan Depok, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55281', 'Kec. Depok, Kab. Sleman'],
    ['Kelurahan X, kecamatan mlati, KABUPATEN SLEMAN', 'Kec. mlati, Kab. SLEMAN'],
  ])('shows kecamatan and region for %s', (label, expected) => expect(compactLocation(label)).toBe(expected));

  it.each([
    ['Mantrijeron, Kota Jogja', 'Mantrijeron, Kota Jogja'], // no kecamatan given: last two parts
    ['Pakuncen', 'Pakuncen'], // single part
    ['Jl.PanjangTanpaSpasi', 'Jl.PanjangTanpaSpasi'],
    ['', ''],
    ['  ,  , ', ''],
  ])('falls back sensibly when there is no kecamatan: %j', (label, expected) => expect(compactLocation(label)).toBe(expected));

  it('keeps only the kecamatan when no region part is present, and never returns more than two parts', () => {
    expect(compactLocation('Gejayan, Kec. Depok')).toBe('Kec. Depok');
    expect(compactLocation('A, B, C, D, E').split(', ').length).toBeLessThanOrEqual(2);
  });
});

describe('one-line status for list cards', () => {
  it.each([
    [null, null],
    ['2026-10-25T00:00:00Z', 'hari ini'],
    ['2026-10-24T00:00:00Z', 'kemarin'],
    ['2026-10-20T00:00:00Z', '5 hari lalu'],
    ['2026-09-25T00:00:00Z', '30 hari lalu'],
    ['2026-09-24T00:00:00Z', '1 bulan lalu'],
    ['2026-11-01T00:00:00Z', 'hari ini'],
  ])('confirmedShort(%s)', (iso, expected) => expect(confirmedShort(iso, NOW)).toBe(expected));

  it('is always the long label without its "Dikonfirmasi " prefix', () => {
    for (const iso of ['2026-10-25T00:00:00Z', '2026-10-20T00:00:00Z', '2026-08-10T00:00:00Z']) {
      expect(`Dikonfirmasi ${confirmedShort(iso, NOW)}`).toBe(confirmedLabel(iso, NOW));
    }
  });

  it('keeps short availability wording honest: unknown never reads as available', () => {
    expect(AVAILABILITY_SHORT).toEqual({ available: 'Tersedia', limited: 'Tersisa sedikit', unavailable: 'Tidak tersedia', unknown: 'Tanya dulu' });
    expect(AVAILABILITY_SHORT.unknown).not.toMatch(/^Tersedia/);
    for (const key of Object.keys(AVAILABILITY_SHORT) as (keyof typeof AVAILABILITY_SHORT)[]) expect(AVAILABILITY_SHORT[key].length).toBeLessThanOrEqual(AVAILABILITY_LABEL[key].length);
  });

  it('every card carries the short age (null only without a confirmation date)', () => {
    for (const card of listPreviewCards(NOW)) expect(card.confirmed_short).toBe(confirmedShort(card.last_confirmed_at, NOW));
  });
});
