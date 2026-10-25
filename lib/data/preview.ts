import { buildDummyData } from '@/data/dummy-listings';
import { buildTrustEvidence, type TrustItem } from '@/lib/data/trust';
import { isPubliclyVisible, toPublicListing } from '@/lib/data/rules';
import { confirmedLabel, confirmedShort } from '@/lib/format';
import type { PublicListing } from '@/lib/data/types';
import type { ListingCardData } from '@/lib/search/listings';

/**
 * Read-only source for the Vercel preview: in-memory dummy fixtures only.
 * There is intentionally no write method; nothing submitted in the preview persists.
 */
export function listPreviewListings(now: Date = new Date(), excludeIds: readonly string[] = []): PublicListing[] {
  return buildDummyData(now)
    .listings.filter((listing) => isPubliclyVisible(listing, now) && !excludeIds.includes(listing.id))
    .map(toPublicListing);
}

/**
 * Card data never carries contact fields, so WhatsApp cannot leak into list views.
 * `excludeIds` models "a report immediately hides the listing" for the viewer who filed it (preview only).
 */
export function listPreviewCards(now: Date = new Date(), excludeIds: readonly string[] = []): ListingCardData[] {
  const data = buildDummyData(now);
  return data.listings
    .filter((l) => isPubliclyVisible(l, now) && !excludeIds.includes(l.id))
    .map((l) => {
      const { contact_whatsapp: _w, contact_name: _n, ...card } = toPublicListing(l);
      return { ...card, evidence: evidenceFor(data, l.id), confirmed_label: confirmedLabel(l.last_confirmed_at, now), confirmed_short: confirmedShort(l.last_confirmed_at, now) };
    });
}

function evidenceFor(data: ReturnType<typeof buildDummyData>, listingId: string): TrustItem[] {
  const l = data.listings.find((x) => x.id === listingId)!;
  return buildTrustEvidence({
    imageCount: data.images.filter((i) => i.listing_id === listingId).length,
    account: data.accounts.find((a) => a.id === l.owner_id),
    contact_reachability_status: l.contact_reachability_status,
    verification_status: l.verification_status,
    permission_status: l.permission_status,
  });
}

export type PreviewDetail = {
  listing: Omit<PublicListing, 'contact_whatsapp'>;
  imageCount: number;
  evidence: TrustItem[];
  confirmed_label: string;
  /** Present only when the listing is public and the submitter gave contact consent. */
  contactWhatsapp: string | null;
};

export function getPreviewDetail(id: string, now: Date = new Date(), excludeIds: readonly string[] = []): PreviewDetail | undefined {
  const data = buildDummyData(now);
  const listing = data.listings.find((l) => l.id === id);
  if (!listing || !isPubliclyVisible(listing, now) || excludeIds.includes(id)) return undefined;
  const { contact_whatsapp, ...rest } = toPublicListing(listing);
  const consent = data.consents.find((c) => c.listing_id === id);
  return {
    listing: rest,
    imageCount: data.images.filter((i) => i.listing_id === id).length,
    evidence: evidenceFor(data, id),
    confirmed_label: confirmedLabel(listing.last_confirmed_at, now),
    contactWhatsapp: consent?.contact_allowed ? contact_whatsapp : null,
  };
}

export function getPreviewListing(id: string, now: Date = new Date()): PublicListing | undefined {
  return listPreviewListings(now).find((listing) => listing.id === id);
}
