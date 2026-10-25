import { isStillAvailable } from '@/lib/format';
import type { TrustItem } from '@/lib/data/trust';
import type { Area, ListingType, PricePeriod, PublicListing } from '@/lib/data/types';

export const PRICE_BANDS = ['lt1', '1to2', 'gt2'] as const;
export type PriceBand = (typeof PRICE_BANDS)[number];
export const PRICE_BAND_LABEL: Record<PriceBand, string> = {
  lt1: 'Di bawah Rp 1 juta',
  '1to2': 'Rp 1–2 juta',
  gt2: 'Di atas Rp 2 juta',
};

export const FACILITY_KEYS = ['wifi', 'ac', 'km_mandi', 'parkir'] as const;
export type FacilityKey = (typeof FACILITY_KEYS)[number];
export const FACILITY_LABEL: Record<FacilityKey, string> = { wifi: 'WiFi', ac: 'AC', km_mandi: 'Kamar mandi', parkir: 'Parkir / carport' };
const FACILITY_MATCH: Record<FacilityKey, RegExp> = { wifi: /wi-?fi/i, ac: /^ac$/i, km_mandi: /kamar mandi/i, parkir: /carport|parkir/i };

export const SORTS = ['recent', 'price_asc', 'price_desc'] as const;
export type Sort = (typeof SORTS)[number];
export const SORT_LABEL: Record<Sort | 'default', string> = {
  default: 'Urutan standar',
  recent: 'Terakhir dikonfirmasi',
  price_asc: 'Harga terendah',
  price_desc: 'Harga tertinggi',
};

export type ListingQuery = {
  q?: string;
  type?: ListingType;
  area?: Area;
  price?: PriceBand;
  fac?: FacilityKey[];
  avail?: boolean;
  sort?: Sort;
};

/** What a card needs. Contact fields are removed so WhatsApp cannot leak into list views. */
export type ListingCardData = Omit<PublicListing, 'contact_whatsapp' | 'contact_name'> & {
  evidence: TrustItem[];
  confirmed_label: string;
  /** Age only, for one-line cards (null when never confirmed). */
  confirmed_short: string | null;
};

const AREA_LABEL: Record<Area, string> = { sleman: 'Sleman', kota_jogja: 'Kota Jogja' };
export function areaLabel(area: Area): string {
  return AREA_LABEL[area];
}

/** Kontrakan are priced per year in the data; comparisons use the monthly equivalent. */
export function monthlyEquivalent(price: number, period: PricePeriod): number {
  return period === 'tahun' ? price / 12 : price;
}

export function priceBandOf(monthly: number): PriceBand {
  if (monthly < 1_000_000) return 'lt1';
  if (monthly <= 2_000_000) return '1to2';
  return 'gt2';
}

export function facilityKeysOf(facilities: string[]): FacilityKey[] {
  return FACILITY_KEYS.filter((k) => facilities.some((f) => FACILITY_MATCH[k].test(f)));
}

type Params = Record<string, string | string[] | undefined>;

export function parseListingQuery(params: Params): ListingQuery {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
  const pick = <T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined => (allowed as readonly string[]).includes(v ?? '') ? (v as T) : undefined;
  const q = first(params.q)?.trim().slice(0, 100);
  const fac = [...new Set(all(params.fac).flatMap((v) => v.split(',')))].filter((v): v is FacilityKey => (FACILITY_KEYS as readonly string[]).includes(v));
  return {
    q: q || undefined,
    type: pick(first(params.type), ['kost', 'kontrakan'] as const),
    area: pick(first(params.area), ['sleman', 'kota_jogja'] as const),
    price: pick(first(params.price), PRICE_BANDS),
    fac: fac.length ? fac : undefined,
    avail: first(params.avail) === '1' ? true : undefined,
    sort: pick(first(params.sort), SORTS),
  };
}

/** Number of active filters, excluding the text query and sort (shown on the filter button). */
export function activeFilterCount(query: ListingQuery): number {
  return [query.type, query.area, query.price, query.avail].filter(Boolean).length + (query.fac?.length ?? 0);
}

/** Case-insensitive match across title, neighborhood, area, and facilities, combined with every active filter. */
export function filterListings<T extends ListingCardData>(listings: T[], query: ListingQuery): T[] {
  const needle = query.q?.toLowerCase();
  return listings.filter((l) => {
    if (query.type && l.type !== query.type) return false;
    if (query.area && l.area !== query.area) return false;
    if (query.avail && !isStillAvailable(l.availability)) return false;
    if (query.price && priceBandOf(monthlyEquivalent(l.price_monthly, l.price_period)) !== query.price) return false;
    if (query.fac?.length) {
      const have = facilityKeysOf(l.facilities);
      if (!query.fac.every((k) => have.includes(k))) return false;
    }
    if (!needle) return true;
    const haystack = [l.title, l.neighborhood_label, areaLabel(l.area).toLowerCase(), l.facilities.join(' ')].join(' ').toLowerCase();
    return needle.split(/\s+/).every((word) => haystack.includes(word));
  });
}

/** Stable sort. The default order is whatever the caller passes in. Missing confirmation dates sort last. */
export function sortListings<T extends ListingCardData>(listings: T[], sort: Sort | undefined): T[] {
  if (!sort) return listings;
  const monthly = (l: T) => monthlyEquivalent(l.price_monthly, l.price_period);
  const time = (l: T) => (l.last_confirmed_at ? new Date(l.last_confirmed_at).getTime() : Number.NEGATIVE_INFINITY);
  const cmp: Record<Sort, (a: T, b: T) => number> = {
    recent: (a, b) => time(b) - time(a),
    price_asc: (a, b) => monthly(a) - monthly(b),
    price_desc: (a, b) => monthly(b) - monthly(a),
  };
  return listings.map((l, i) => [l, i] as const).sort((x, y) => cmp[sort](x[0], y[0]) || x[1] - y[1]).map(([l]) => l);
}

export function toQueryString(query: ListingQuery): string {
  const sp = new URLSearchParams();
  if (query.q) sp.set('q', query.q);
  if (query.type) sp.set('type', query.type);
  if (query.area) sp.set('area', query.area);
  if (query.price) sp.set('price', query.price);
  for (const f of query.fac ?? []) sp.append('fac', f);
  if (query.avail) sp.set('avail', '1');
  if (query.sort) sp.set('sort', query.sort);
  const s = sp.toString();
  return s ? `/?${s}` : '/';
}
