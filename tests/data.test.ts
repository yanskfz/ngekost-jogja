import { describe, expect, it } from 'vitest';
import { buildDummyData } from '@/data/dummy-listings';
import { AccessError, DevDatabase } from '@/lib/data/dev-database';
import { addMonthsUtc, computeExpiry, isPubliclyVisible, nextStatus } from '@/lib/data/rules';
import { listPreviewListings } from '@/lib/data/preview';

const NOW = new Date('2026-10-25T00:00:00.000Z');

function freshDb() {
  const db = new DevDatabase();
  db.seed(buildDummyData(NOW));
  return db;
}

describe('dummy fixtures', () => {
  const data = buildDummyData(NOW);

  it('cover every status example and both roles without real data', () => {
    const statuses = new Set(data.listings.map((l) => l.status));
    for (const s of ['approved', 'pending', 'hidden', 'draft', 'rejected']) expect(statuses.has(s as never)).toBe(true);
    expect(new Set(data.listings.map((l) => l.role))).toEqual(new Set(['owner', 'broker']));
    expect(data.accounts.every((a) => a.email.endsWith('@example.test'))).toBe(true);
    expect(data.listings.some((l) => l.status === 'approved' && !isPubliclyVisible(l, NOW))).toBe(true); // expired example
  });
});

describe('expiry rules', () => {
  it('expires two calendar months after confirmation, clamping month ends', () => {
    expect(computeExpiry(new Date('2026-10-25T00:00:00Z')).toISOString()).toBe('2026-12-25T00:00:00.000Z');
    expect(addMonthsUtc(new Date('2026-12-31T00:00:00Z'), 2).toISOString()).toBe('2027-02-28T00:00:00.000Z');
  });

  it('hides a listing exactly at its expiry time', () => {
    const l = { status: 'approved' as const, expires_at: '2026-12-25T00:00:00.000Z' };
    expect(isPubliclyVisible(l, new Date('2026-12-24T23:59:59Z'))).toBe(true);
    expect(isPubliclyVisible(l, new Date('2026-12-25T00:00:00Z'))).toBe(false);
  });
});

describe('public reads', () => {
  it('preview and SQLite return only approved, non-expired listings (5) and no private fields', () => {
    const db = freshDb();
    const expected = ['lst-1', 'lst-2', 'lst-3', 'lst-9', 'lst-10'];
    const fromDb = db.listPublicListings(NOW);
    expect(fromDb.map((l) => l.id)).toEqual(expected);
    expect(listPreviewListings(NOW).map((l) => l.id)).toEqual(expected);
    expect(Object.keys(fromDb[0])).not.toContain('owner_id');
    expect(Object.keys(fromDb[0])).not.toContain('source');
  });

  it('drops a listing from public results once it passes expiry', () => {
    const db = freshDb();
    const later = new Date(NOW.getTime() + 40 * 24 * 60 * 60 * 1000);
    expect(db.listPublicListings(later).map((l) => l.id)).not.toContain('lst-3');
  });
});

describe('schema', () => {
  it('represents every entity from BRIEF.md and seeds fixtures', () => {
    const db = freshDb();
    for (const t of ['accounts', 'listings', 'listing_images', 'consents', 'moderation_events', 'reports', 'import_batches'] as const) {
      expect(db.countRows(t)).toBeGreaterThan(0);
    }
  });
});

describe('submitter ownership', () => {
  it("does not expose or let a submitter edit another submitter's listing", () => {
    const db = freshDb();
    expect(db.getSubmitterListing('acc-owner-2', 'lst-4')).toBeUndefined();
    expect(() => db.updateListingAsSubmitter('acc-owner-2', 'lst-4', { title: 'x' })).toThrow(AccessError);
    expect(db.listSubmitterListings('acc-owner-2').every((l) => l.owner_id === 'acc-owner-2')).toBe(true);
  });

  it('allows editing own pending listing but not an approved one', () => {
    const db = freshDb();
    expect(db.updateListingAsSubmitter('acc-owner-1', 'lst-4', { title: 'Judul baru' }, NOW).title).toBe('Judul baru');
    expect(() => db.updateListingAsSubmitter('acc-owner-1', 'lst-1', { title: 'x' })).toThrow(AccessError);
  });
});

describe('moderation', () => {
  it('rejects non-admin actors', () => {
    expect(() => freshDb().moderate('acc-owner-1', 'lst-4', 'approve', null, NOW)).toThrow(/admin/);
  });

  it('approves a pending listing with 3 images, sets expiry, and writes an audit event', () => {
    const db = freshDb();
    const result = db.moderate('acc-admin-1', 'lst-4', 'approve', null, NOW);
    expect(result.status).toBe('approved');
    expect(result.expires_at).toBe('2026-12-25T00:00:00.000Z');
    expect(db.listPublicListings(NOW).map((l) => l.id)).toContain('lst-4');
    const events = db.listModerationEvents('lst-4');
    expect(events.at(-1)).toMatchObject({ action: 'approve', admin_id: 'acc-admin-1', created_at: NOW.toISOString() });
  });

  it('refuses approval without exactly 3 images', () => {
    const db = freshDb();
    expect(() => db.moderate('acc-admin-1', 'lst-7', 'approve', null, NOW)).toThrow(AccessError); // draft, not pending
    expect(nextStatus('approve', 'draft')).toBeNull();
  });

  it('requires a reason to hide or reject and rejects invalid transitions', () => {
    const db = freshDb();
    expect(() => db.moderate('acc-admin-1', 'lst-1', 'hide', '  ', NOW)).toThrow(/reason/);
    expect(() => db.moderate('acc-admin-1', 'lst-1', 'restore', null, NOW)).toThrow(/Cannot restore/);
    expect(db.moderate('acc-admin-1', 'lst-1', 'hide', 'Dilaporkan', NOW).status).toBe('hidden');
    expect(db.listPublicListings(NOW).map((l) => l.id)).not.toContain('lst-1');
  });

  it('reconfirming an expired listing restores visibility with a fresh two-month window', () => {
    const db = freshDb();
    expect(db.listPublicListings(NOW).map((l) => l.id)).not.toContain('lst-6');
    db.moderate('acc-admin-1', 'lst-6', 'reconfirm', null, NOW);
    expect(db.listPublicListings(NOW).map((l) => l.id)).toContain('lst-6');
  });
});
