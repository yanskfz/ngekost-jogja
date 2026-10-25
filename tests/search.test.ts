import { describe, expect, it } from 'vitest';
import { getPreviewDetail, listPreviewCards } from '@/lib/data/preview';
import { gateListings } from '@/lib/data/access';
import { filterListings, parseListingQuery, toQueryString } from '@/lib/search/listings';

const NOW = new Date('2026-10-25T00:00:00.000Z');
const cards = listPreviewCards(NOW);

describe('search and filters', () => {
  it('matches text across title and address, case-insensitively', () => {
    expect(filterListings(cards, { q: 'TIMOHO' }).map((l) => l.id)).toEqual(['lst-1']);
    expect(filterListings(cards, { q: 'kota jogja' }).map((l) => l.id)).toEqual(['lst-1', 'lst-3', 'lst-10']);
    expect(filterListings(cards, { q: 'zzz' })).toEqual([]);
  });

  it('combines type and area filters', () => {
    expect(filterListings(cards, { type: 'kost', area: 'kota_jogja' }).map((l) => l.id)).toEqual(['lst-1', 'lst-3']);
  });

  it('keeps the price period with the price (kontrakan priced per tahun)', () => {
    expect(cards.find((l) => l.id === 'lst-2')).toMatchObject({ price_monthly: 18000000, price_period: 'tahun' });
    expect(cards.find((l) => l.id === 'lst-1')).toMatchObject({ price_period: 'bulan' });
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

import { activeFilterCount, facilityKeysOf, monthlyEquivalent, priceBandOf, sortListings, type ListingCardData } from '@/lib/search/listings';

const ids = (l: { id: string }[]) => l.map((x) => x.id);
const NUM = (n: number) => `lst-${n}`;

describe('expanded filters', () => {
  it('compares yearly and monthly prices on a monthly basis', () => {
    expect(monthlyEquivalent(18_000_000, 'tahun')).toBe(1_500_000);
    expect(monthlyEquivalent(1_300_000, 'bulan')).toBe(1_300_000);
    expect([999_999, 1_000_000, 2_000_000, 2_000_001].map(priceBandOf)).toEqual(['lt1', '1to2', '1to2', 'gt2']);
  });

  const all = listPreviewCards(NOW); // the full public set of 5, before any anonymous gate
  it('filters by price band over the full public set', () => {
    expect(ids(filterListings(all, { price: 'lt1' }))).toEqual([NUM(9)]);
    expect(ids(filterListings(all, { price: '1to2' }))).toEqual([NUM(1), NUM(2), NUM(3), NUM(10)]);
    expect(ids(filterListings(all, { price: 'gt2' }))).toEqual([]);
  });
  it('filters by facility, including combinations', () => {
    expect(ids(filterListings(all, { fac: ['wifi'] }))).toEqual([NUM(1), NUM(3), NUM(9)]);
    expect(ids(filterListings(all, { fac: ['ac'] }))).toEqual([NUM(1)]);
    expect(ids(filterListings(all, { fac: ['parkir'] }))).toEqual([NUM(2), NUM(10)]);
    expect(ids(filterListings(all, { fac: ['wifi', 'km_mandi'] }))).toEqual([NUM(3), NUM(9)]);
    expect(ids(filterListings(all, { fac: ['ac', 'parkir'] }))).toEqual([]);
    expect(facilityKeysOf(['1 kamar', 'WiFi', 'Carport'])).toEqual(['wifi', 'parkir']);
  });
  it('has no role filter: a role parameter never changes the results', () => {
    expect((parseListingQuery({ role: 'broker' }) as Record<string, unknown>).role).toBeUndefined();
    expect(ids(filterListings(all, parseListingQuery({ role: 'broker' })))).toEqual(ids(all));
    expect(toQueryString(parseListingQuery({ role: 'owner', price: 'lt1' }))).toBe('/?price=lt1');
  });
  it('"masih tersedia" excludes unknown and unavailable listings', () => {
    expect(ids(filterListings(all, { avail: true }))).toEqual([NUM(1), NUM(3), NUM(9)]);
  });
  it('combines every filter and the text query', () => {
    expect(ids(filterListings(all, { type: 'kost', area: 'sleman', price: 'lt1', fac: ['wifi'], avail: true, q: 'cempaka' }))).toEqual([NUM(9)]);
    expect(ids(filterListings(all, { type: 'kontrakan', avail: true }))).toEqual([]);
  });
  it('matches the manual area search against neighborhood labels', () => {
    expect(ids(filterListings(all, { q: 'depok' }))).toEqual([NUM(2), NUM(9)]);
    expect(ids(filterListings(all, { q: 'umbulharjo' }))).toEqual([NUM(1)]);
    expect(ids(filterListings(all, { q: 'tidak ada' }))).toEqual([]);
  });
  it('never lets a filter surface a listing the anonymous gate withheld', () => {
    const { allowed } = gateListings(all, false);
    expect(ids(filterListings(allowed, { fac: ['parkir'] }))).toEqual([NUM(2)]);
    expect(ids(filterListings(allowed, { price: 'lt1' }))).toEqual([]);
  });
});

describe('sorting', () => {
  const all = listPreviewCards(NOW);
  it('sorts by price on a monthly basis, both directions', () => {
    expect(ids(sortListings(all, 'price_asc'))).toEqual([NUM(9), NUM(3), NUM(1), NUM(2), NUM(10)]);
    expect(ids(sortListings(all, 'price_desc'))).toEqual([NUM(10), NUM(2), NUM(1), NUM(3), NUM(9)]);
  });
  it('sorts by most recently confirmed', () => {
    expect(ids(sortListings(all, 'recent'))).toEqual([NUM(9), NUM(1), NUM(10), NUM(2), NUM(3)]);
  });
  it('keeps the given order by default, does not mutate its input, and is stable on ties', () => {
    const copy = [...all];
    expect(sortListings(all, undefined)).toBe(all);
    sortListings(all, 'price_asc');
    expect(all).toEqual(copy);
    const tie = [{ ...all[0], id: 'a' }, { ...all[0], id: 'b' }, { ...all[0], id: 'c' }] as ListingCardData[];
    expect(ids(sortListings(tie, 'price_asc'))).toEqual(['a', 'b', 'c']);
  });
  it('puts listings without a confirmation date last when sorting by recency', () => {
    const synthetic = [{ ...all[0], id: 'none', last_confirmed_at: null }, ...all.slice(0, 2)] as ListingCardData[];
    expect(ids(sortListings(synthetic, 'recent')).at(-1)).toBe('none');
  });
});

describe('query parsing and url round trip', () => {
  it('ignores invalid values and de-duplicates facilities', () => {
    const q = parseListingQuery({ price: 'cheap', role: 'admin', avail: '2', sort: 'rating', fac: ['wifi', 'bogus', 'wifi,ac'] });
    expect(q).toEqual({ q: undefined, type: undefined, area: undefined, price: undefined, fac: ['wifi', 'ac'], avail: undefined, sort: undefined });
  });
  it('round-trips every parameter', () => {
    const query = { q: 'depok', type: 'kost' as const, area: 'sleman' as const, price: '1to2' as const, fac: ['wifi' as const, 'ac' as const], avail: true, sort: 'price_asc' as const };
    const url = new URL('http://x' + toQueryString(query));
    const params: Record<string, string | string[]> = {};
    for (const key of new Set(url.searchParams.keys())) {
      const values = url.searchParams.getAll(key);
      params[key] = values.length > 1 ? values : values[0];
    }
    expect(parseListingQuery(params)).toEqual(query);
    expect(toQueryString({})).toBe('/');
  });
  it('counts active filters but not the text query or sort', () => {
    expect(activeFilterCount({ q: 'x', sort: 'recent' })).toBe(0);
    expect(activeFilterCount({ type: 'kost', price: 'lt1', fac: ['wifi', 'ac'], avail: true })).toBe(5);
  });
});
