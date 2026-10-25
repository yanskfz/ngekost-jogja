import { buildDummyData } from '@/data/dummy-listings';
import { isPubliclyVisible, toPublicListing } from '@/lib/data/rules';
import type { PublicListing } from '@/lib/data/types';
import type { ListingCardData } from '@/lib/search/listings';

/**
 * Read-only source for the Vercel preview: in-memory dummy fixtures only.
 * There is intentionally no write method; nothing submitted in the preview persists.
 */
export function listPreviewListings(now: Date = new Date()): PublicListing[] {
  return buildDummyData(now)
    .listings.filter((listing) => isPubliclyVisible(listing, now))
    .map(toPublicListing);
}

/** Card data never carries contact fields, so WhatsApp cannot leak into list views. */
export function listPreviewCards(now: Date = new Date()): ListingCardData[] {
  return listPreviewListings(now).map(({ contact_whatsapp: _w, contact_name: _n, ...card }) => card);
}

export type PreviewDetail = {
  listing: Omit<PublicListing, 'contact_whatsapp'>;
  imageCount: number;
  /** Present only when the listing is public and the submitter gave contact consent. */
  contactWhatsapp: string | null;
};

export function getPreviewDetail(id: string, now: Date = new Date()): PreviewDetail | undefined {
  const data = buildDummyData(now);
  const listing = data.listings.find((l) => l.id === id);
  if (!listing || !isPubliclyVisible(listing, now)) return undefined;
  const { contact_whatsapp, ...rest } = toPublicListing(listing);
  const consent = data.consents.find((c) => c.listing_id === id);
  return {
    listing: rest,
    imageCount: data.images.filter((i) => i.listing_id === id).length,
    contactWhatsapp: consent?.contact_allowed ? contact_whatsapp : null,
  };
}

export function getPreviewListing(id: string, now: Date = new Date()): PublicListing | undefined {
  return listPreviewListings(now).find((listing) => listing.id === id);
}
