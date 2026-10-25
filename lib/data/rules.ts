import { LISTING_LIFETIME_MONTHS, REQUIRED_IMAGE_COUNT } from '@/lib/data/constants';
import { MAX_OFFSET_M, approximateLocation } from '@/lib/location/approximate';
import type { Listing, ListingStatus, ModerationAction, PublicListing } from '@/lib/data/types';

export { LISTING_LIFETIME_MONTHS, REQUIRED_IMAGE_COUNT };

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
  // Exact coordinates and the exact address are deliberately not copied: only a jittered point and a neighborhood label.
  const approx = approximateLocation(listing.id, { latitude: listing.map_latitude, longitude: listing.map_longitude });
  return {
    id: listing.id,
    title: listing.title,
    type: listing.type,
    area: listing.area,
    neighborhood_label: listing.neighborhood_label,
    approx_latitude: approx.latitude,
    approx_longitude: approx.longitude,
    approx_precision_m: MAX_OFFSET_M,
    price_monthly: listing.price_monthly,
    price_period: listing.price_period,
    deposit_information: listing.deposit_information,
    facilities: listing.facilities,
    condition_details: listing.condition_details,
    contact_name: listing.contact_name,
    contact_whatsapp: listing.contact_whatsapp,
    role: listing.role,
    availability: listing.availability,
    contact_reachability_status: listing.contact_reachability_status,
    broker_fee_status: listing.broker_fee_status,
    broker_fee_amount: listing.broker_fee_amount,
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
