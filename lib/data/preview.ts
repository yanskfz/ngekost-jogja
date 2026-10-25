import { buildDummyData } from '@/data/dummy-listings';
import { isPubliclyVisible, toPublicListing } from '@/lib/data/rules';
import type { PublicListing } from '@/lib/data/types';

/**
 * Read-only source for the Vercel preview: in-memory dummy fixtures only.
 * There is intentionally no write method; nothing submitted in the preview persists.
 */
export function listPreviewListings(now: Date = new Date()): PublicListing[] {
  return buildDummyData(now)
    .listings.filter((listing) => isPubliclyVisible(listing, now))
    .map(toPublicListing);
}

export function getPreviewListing(id: string, now: Date = new Date()): PublicListing | undefined {
  return listPreviewListings(now).find((listing) => listing.id === id);
}
