import { describe, expect, it } from 'vitest';
import { ANONYMOUS_LISTING_LIMIT, canViewListing, gateListings } from '@/lib/data/access';
import { listPreviewCards } from '@/lib/data/preview';
import { filterListings } from '@/lib/search/listings';

const NOW = new Date('2026-10-25T00:00:00.000Z');
const all = listPreviewCards(NOW);

describe('anonymous listing gate', () => {
  it('seeds exactly five public listings', () => {
    expect(all).toHaveLength(5);
    expect(ANONYMOUS_LISTING_LIMIT).toBe(3);
  });

  it('gives anonymous viewers the first three and counts two locked', () => {
    const { allowed, lockedCount } = gateListings(all, false);
    expect(allowed.map((l) => l.id)).toEqual(['lst-1', 'lst-2', 'lst-3']);
    expect(lockedCount).toBe(2);
  });

  it('gives signed-in viewers all five and nothing locked', () => {
    const { allowed, lockedCount } = gateListings(all, true);
    expect(allowed).toHaveLength(5);
    expect(lockedCount).toBe(0);
  });

  it('never lets a search or filter surface a locked listing', () => {
    const { allowed } = gateListings(all, false);
    expect(filterListings(allowed, { type: 'kontrakan' }).map((l) => l.id)).toEqual(['lst-2']);
    expect(filterListings(allowed, { q: 'mawar' })).toEqual([]);
    expect(filterListings(allowed, { q: 'cempaka' })).toEqual([]);
  });

  it('blocks direct access to the fourth and fifth listing for anonymous viewers only', () => {
    expect(canViewListing(all, 'lst-3', false)).toBe(true);
    expect(canViewListing(all, 'lst-9', false)).toBe(false);
    expect(canViewListing(all, 'lst-10', false)).toBe(false);
    expect(canViewListing(all, 'lst-10', true)).toBe(true);
  });
});
