import { describe, expect, it } from 'vitest';
import { getPreviewDetail, listPreviewCards } from '@/lib/data/preview';
import { filterListings, parseListingQuery, toQueryString } from '@/lib/search/listings';

const NOW = new Date('2026-10-25T00:00:00.000Z');
const cards = listPreviewCards(NOW);

describe('search and filters', () => {
  it('matches text across title and address, case-insensitively', () => {
    expect(filterListings(cards, { q: 'MELATI' }).map((l) => l.id)).toEqual(['lst-1']);
    expect(filterListings(cards, { q: 'kota jogja' }).map((l) => l.id)).toEqual(['lst-2', 'lst-3']);
    expect(filterListings(cards, { q: 'zzz' })).toEqual([]);
  });

  it('combines type and area filters', () => {
    expect(filterListings(cards, { type: 'kost', area: 'kota_jogja' }).map((l) => l.id)).toEqual(['lst-3']);
  });

  it('ignores invalid parameters and round-trips a query string', () => {
    const q = parseListingQuery({ q: ' sleman ', type: 'villa', area: ['sleman'] });
    expect(q).toEqual({ q: 'sleman', type: undefined, area: 'sleman' });
    expect(toQueryString(q)).toBe('/?q=sleman&area=sleman');
  });
});

describe('contact exposure', () => {
  it('card data never includes contact fields', () => {
    for (const c of cards) {
      expect(c).not.toHaveProperty('contact_whatsapp');
      expect(c).not.toHaveProperty('contact_name');
    }
  });

  it('detail shows WhatsApp only for public listings with contact consent', () => {
    expect(getPreviewDetail('lst-1', NOW)?.contactWhatsapp).toMatch(/^\+62/);
    expect(getPreviewDetail('lst-4', NOW)).toBeUndefined(); // pending
    expect(getPreviewDetail('lst-5', NOW)).toBeUndefined(); // hidden
    expect(getPreviewDetail('lst-6', NOW)).toBeUndefined(); // expired
  });
});
