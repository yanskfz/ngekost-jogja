import type { Listing, ListingStatus, ModerationAction, PublicListing } from '@/lib/data/types';

export const LISTING_LIFETIME_MONTHS = 2;
export const REQUIRED_IMAGE_COUNT = 3;

export function addMonthsUtc(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function computeExpiry(confirmedAt: Date): Date {
  return addMonthsUtc(confirmedAt, LISTING_LIFETIME_MONTHS);
}

/** A listing is public only when approved and not past its expiry. */
export function isPubliclyVisible(listing: Pick<Listing, 'status' | 'expires_at'>, now: Date): boolean {
  if (listing.status !== 'approved') return false;
  if (!listing.expires_at) return false;
  return new Date(listing.expires_at).getTime() > now.getTime();
}

export function toPublicListing(listing: Listing): PublicListing {
  return {
    id: listing.id,
    title: listing.title,
    type: listing.type,
    area: listing.area,
    address: listing.address,
    map_latitude: listing.map_latitude,
    map_longitude: listing.map_longitude,
    price_monthly: listing.price_monthly,
    price_period: listing.price_period,
    deposit_information: listing.deposit_information,
    facilities: listing.facilities,
    condition_details: listing.condition_details,
    contact_name: listing.contact_name,
    contact_whatsapp: listing.contact_whatsapp,
    role: listing.role,
    last_confirmed_at: listing.last_confirmed_at,
    expires_at: listing.expires_at,
  };
}

const TRANSITIONS: Record<ModerationAction, { from: ListingStatus[]; to: ListingStatus }> = {
  approve: { from: ['pending'], to: 'approved' },
  reject: { from: ['pending'], to: 'rejected' },
  hide: { from: ['pending', 'approved', 'reported'], to: 'hidden' },
  restore: { from: ['hidden', 'reported'], to: 'approved' },
  expire: { from: ['approved'], to: 'expired' },
  reconfirm: { from: ['approved', 'expired'], to: 'approved' },
};

export function nextStatus(action: ModerationAction, current: ListingStatus): ListingStatus | null {
  const rule = TRANSITIONS[action];
  return rule.from.includes(current) ? rule.to : null;
}

/** Statuses a submitter may still edit (plan Task 3: only own draft or pending listings). */
export const SUBMITTER_EDITABLE_STATUSES: ListingStatus[] = ['draft', 'pending'];

/** Actions that must carry a written reason. */
export const REASON_REQUIRED_ACTIONS: ModerationAction[] = ['reject', 'hide'];
