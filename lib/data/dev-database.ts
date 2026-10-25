import { DatabaseSync } from 'node:sqlite';
import {
  REASON_REQUIRED_ACTIONS,
  REQUIRED_IMAGE_COUNT,
  SUBMITTER_EDITABLE_STATUSES,
  computeExpiry,
  isPubliclyVisible,
  nextStatus,
  toPublicListing,
} from '@/lib/data/rules';
import { SQLITE_SCHEMA } from '@/lib/data/sqlite-schema';
import type { DevData, Listing, ModerationAction, PublicListing, ReportReason } from '@/lib/data/types';

/**
 * Local development/test adapter backed by SQLite. Not used by the Vercel preview and not a production database.
 * It enforces the ownership and moderation rules the hosted backend must also enforce (see docs/DATA_MODEL.md).
 */

export class AccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessError';
  }
}

export type SubmitterListingPatch = Partial<
  Pick<Listing, 'title' | 'price_monthly' | 'deposit_information' | 'condition_details' | 'facilities' | 'contact_name'>
>;

type Row = Record<string, unknown>;

function toListing(row: Row): Listing {
  return { ...(row as unknown as Listing), facilities: JSON.parse(String(row.facilities)) as string[] };
}

export class DevDatabase {
  private readonly db: DatabaseSync;
  private idCounter = 0;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec(SQLITE_SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  seed(data: DevData): void {
    const run = (sql: string, ...params: (string | number | null)[]) => this.db.prepare(sql).run(...params);
    for (const a of data.accounts) {
      run('INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?)', a.id, a.email, a.whatsapp, a.role, a.submitter_type, a.email_verified_at, a.whatsapp_verified_at, a.created_at);
    }
    const listingColumns = [
      'id', 'title', 'type', 'area', 'address', 'neighborhood_label', 'map_latitude', 'map_longitude', 'price_monthly', 'price_period',
      'deposit_information', 'facilities', 'condition_details', 'contact_name', 'contact_whatsapp', 'source_url', 'role', 'availability', 'contact_reachability_status',
      'broker_fee_status', 'broker_fee_amount', 'status', 'owner_id', 'source', 'permission_status', 'verification_status',
      'last_confirmed_at', 'expires_at', 'created_at', 'updated_at',
    ] as const;
    const insertListing = `INSERT INTO listings (${listingColumns.join(',')}) VALUES (${listingColumns.map(() => '?').join(',')})`;
    for (const l of data.listings) {
      run(insertListing, ...listingColumns.map((c) => (c === 'facilities' ? JSON.stringify(l.facilities) : (l[c] as string | number | null))));
    }
    for (const i of data.images) run('INSERT INTO listing_images VALUES (?,?,?,?,?)', i.id, i.listing_id, i.position, i.storage_path, i.created_at);
    for (const c of data.consents) {
      run('INSERT INTO consents VALUES (?,?,?,?,?,?,?,?)', c.id, c.listing_id, c.account_id, c.publish_allowed ? 1 : 0, c.contact_allowed ? 1 : 0, c.consent_text_version, c.captured_at, c.audit_id);
    }
    for (const e of data.moderationEvents) run('INSERT INTO moderation_events VALUES (?,?,?,?,?,?)', e.id, e.listing_id, e.admin_id, e.action, e.reason, e.created_at);
    for (const r of data.reports) run('INSERT INTO reports (id, listing_id, reporter_contact, reporter_key, reason, detail, status, created_at, resolved_at) VALUES (?,?,?,?,?,?,?,?,?)', r.id, r.listing_id, r.reporter_contact, null, r.reason, r.detail, r.status, r.created_at, r.resolved_at);
    for (const b of data.importBatches) run('INSERT INTO import_batches VALUES (?,?,?,?,?)', b.id, b.admin_id, b.filename, b.row_count, b.created_at);
  }

  /** Public read path: approved, non-expired listings only, without private columns. */
  listPublicListings(now: Date = new Date()): PublicListing[] {
    const rows = this.db
      .prepare("SELECT * FROM listings WHERE status = 'approved' AND expires_at IS NOT NULL AND expires_at > ? ORDER BY rowid")
      .all(now.toISOString());
    return rows.map(toListing).filter((l) => isPubliclyVisible(l, now)).map(toPublicListing);
  }

  listSubmitterListings(accountId: string): Listing[] {
    return this.db.prepare('SELECT * FROM listings WHERE owner_id = ? ORDER BY rowid').all(accountId).map(toListing);
  }

  /** Returns undefined when the listing does not exist or belongs to someone else (no existence leak). */
  getSubmitterListing(accountId: string, listingId: string): Listing | undefined {
    const row = this.db.prepare('SELECT * FROM listings WHERE id = ? AND owner_id = ?').get(listingId, accountId);
    return row ? toListing(row) : undefined;
  }

  updateListingAsSubmitter(accountId: string, listingId: string, patch: SubmitterListingPatch, now: Date = new Date()): Listing {
    const listing = this.getSubmitterListing(accountId, listingId);
    if (!listing) throw new AccessError('Listing not found for this account.');
    if (!SUBMITTER_EDITABLE_STATUSES.includes(listing.status)) {
      throw new AccessError(`Listings with status "${listing.status}" cannot be edited by the submitter.`);
    }
    const next = { ...listing, ...patch, updated_at: now.toISOString() };
    this.db
      .prepare('UPDATE listings SET title=?, price_monthly=?, deposit_information=?, condition_details=?, facilities=?, contact_name=?, updated_at=? WHERE id=? AND owner_id=?')
      .run(next.title, next.price_monthly, next.deposit_information, next.condition_details, JSON.stringify(next.facilities), next.contact_name, next.updated_at, listingId, accountId);
    return next;
  }

  /** Admin-only status change. Records an auditable moderation event in the same transaction. */
  moderate(adminId: string, listingId: string, action: ModerationAction, reason: string | null, now: Date = new Date()): Listing {
    const admin = this.db.prepare('SELECT role FROM accounts WHERE id = ?').get(adminId);
    if (!admin || admin.role !== 'admin') throw new AccessError('Only an admin can moderate listings.');
    const row = this.db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
    if (!row) throw new AccessError('Listing not found.');
    const listing = toListing(row);

    const target = nextStatus(action, listing.status);
    if (!target) throw new AccessError(`Cannot ${action} a listing with status "${listing.status}".`);
    if (REASON_REQUIRED_ACTIONS.includes(action) && !reason?.trim()) throw new AccessError(`A reason is required to ${action} a listing.`);
    if (action === 'approve') {
      const { count } = this.db.prepare('SELECT COUNT(*) AS count FROM listing_images WHERE listing_id = ?').get(listingId) as { count: number };
      if (count !== REQUIRED_IMAGE_COUNT) throw new AccessError(`Approval requires exactly ${REQUIRED_IMAGE_COUNT} images.`);
    }

    const stamp = now.toISOString();
    const confirmed = action === 'approve' || action === 'reconfirm' || (action === 'restore' && !listing.last_confirmed_at);
    const lastConfirmedAt = confirmed ? stamp : listing.last_confirmed_at;
    const expiresAt = confirmed ? computeExpiry(now).toISOString() : listing.expires_at;

    this.db.exec('BEGIN');
    try {
      this.db
        .prepare('UPDATE listings SET status=?, last_confirmed_at=?, expires_at=?, updated_at=? WHERE id=?')
        .run(target, lastConfirmedAt, expiresAt, stamp, listingId);
      this.db
        .prepare('INSERT INTO moderation_events VALUES (?,?,?,?,?,?)')
        .run(`evt-dev-${++this.idCounter}`, listingId, adminId, action, reason, stamp);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return { ...listing, status: target, last_confirmed_at: lastConfirmedAt, expires_at: expiresAt, updated_at: stamp };
  }

  /**
   * Report intake. One durable report per (listing, reporter key, reason) per 24 h window: a retry returns the existing
   * report. An approved listing is hidden from public results immediately (status 'reported') until an admin decides.
   */
  createReport(
    listingId: string,
    input: { reason: ReportReason; detail: string | null; contact: string | null },
    reporterKey: string,
    now: Date = new Date(),
  ): { id: string; created: boolean } {
    const listing = this.db.prepare('SELECT id, status FROM listings WHERE id = ?').get(listingId);
    if (!listing) throw new AccessError('Listing not found.');
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const existing = this.db
      .prepare('SELECT id FROM reports WHERE listing_id = ? AND reporter_key = ? AND reason = ? AND created_at > ? ORDER BY created_at LIMIT 1')
      .get(listingId, reporterKey, input.reason, since);
    if (existing) return { id: String(existing.id), created: false };
    const id = `rep-dev-${++this.idCounter}`;
    const stamp = now.toISOString();
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare("INSERT INTO reports (id, listing_id, reporter_contact, reporter_key, reason, detail, status, created_at, resolved_at) VALUES (?,?,?,?,?,?,'open',?,NULL)")
        .run(id, listingId, input.contact, reporterKey, input.reason, input.detail, stamp);
      if (listing.status === 'approved') this.db.prepare("UPDATE listings SET status = 'reported', updated_at = ? WHERE id = ?").run(stamp, listingId);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return { id, created: true };
  }

  listReports(listingId: string): Row[] {
    return this.db.prepare('SELECT * FROM reports WHERE listing_id = ? ORDER BY created_at, id').all(listingId);
  }

  listModerationEvents(listingId: string): Row[] {
    return this.db.prepare('SELECT * FROM moderation_events WHERE listing_id = ? ORDER BY created_at, id').all(listingId);
  }

  countRows(table: 'accounts' | 'listings' | 'listing_images' | 'consents' | 'moderation_events' | 'reports' | 'import_batches'): number {
    return (this.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
  }
}
