import type { ListingCardData } from '@/lib/search/listings';

/** Anonymous visitors may see this many complete listings; the rest of the public set is locked. */
export const ANONYMOUS_LISTING_LIMIT = 3;

export type GatedListings<T> = {
  /** Listings the viewer may see in full. For anonymous viewers this is only ever the first N of the public set. */
  allowed: T[];
  /** Number of public listings withheld from this viewer. Never the withheld data itself. */
  lockedCount: number;
};

/**
 * The limit is applied to the global ordered public set, before any search or filter, so a filter can never
 * surface a locked listing.
 */
export function gateListings<T extends Pick<ListingCardData, 'id'>>(publicListings: T[], signedIn: boolean): GatedListings<T> {
  if (signedIn) return { allowed: publicListings, lockedCount: 0 };
  return {
    allowed: publicListings.slice(0, ANONYMOUS_LISTING_LIMIT),
    lockedCount: Math.max(0, publicListings.length - ANONYMOUS_LISTING_LIMIT),
  };
}

export function canViewListing(publicListings: Pick<ListingCardData, 'id'>[], id: string, signedIn: boolean): boolean {
  return gateListings(publicListings, signedIn).allowed.some((l) => l.id === id);
}
