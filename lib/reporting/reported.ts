// Preview-only model of "a report immediately hides the listing": the reporter's own browser stops seeing it.
// A hosted backend must hide it for everyone and record the report durably (docs/TRUST_AND_DISCOVERY.md).
export const REPORTED_COOKIE = 'nk_reported';
export const MAX_REPORTED = 20;
const LISTING_ID = /^lst-\d{1,6}$/;

export function isListingId(v: unknown): v is string {
  return typeof v === 'string' && LISTING_ID.test(v);
}

export function parseReportedIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').filter(isListingId))].slice(-MAX_REPORTED);
}

/** Idempotent: reporting the same listing again leaves the value unchanged. */
export function addReportedId(raw: string | undefined, id: string): string {
  const ids = parseReportedIds(raw);
  if (!ids.includes(id)) ids.push(id);
  return ids.slice(-MAX_REPORTED).join(',');
}
