import type { Area, ListingType, PublicListing } from '@/lib/data/types';

export type ListingQuery = {
  q?: string;
  type?: ListingType;
  area?: Area;
};

export type ListingCardData = Omit<PublicListing, 'contact_whatsapp' | 'contact_name'>;

const AREA_LABEL: Record<Area, string> = { sleman: 'Sleman', kota_jogja: 'Kota Jogja' };

export function areaLabel(area: Area): string {
  return AREA_LABEL[area];
}

export function parseListingQuery(params: Record<string, string | string[] | undefined>): ListingQuery {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = first(params.q)?.trim().slice(0, 100);
  const type = first(params.type);
  const area = first(params.area);
  return {
    q: q || undefined,
    type: type === 'kost' || type === 'kontrakan' ? type : undefined,
    area: area === 'sleman' || area === 'kota_jogja' ? area : undefined,
  };
}

/** Case-insensitive text match across title, address, area, and facilities, combined with type/area filters. */
export function filterListings<T extends ListingCardData>(listings: T[], query: ListingQuery): T[] {
  const needle = query.q?.toLowerCase();
  return listings.filter((l) => {
    if (query.type && l.type !== query.type) return false;
    if (query.area && l.area !== query.area) return false;
    if (!needle) return true;
    const haystack = [l.title, l.address, areaLabel(l.area).toLowerCase(), l.facilities.join(' ')].join(' ').toLowerCase();
    return needle.split(/\s+/).every((word) => haystack.includes(word));
  });
}

export function toQueryString(query: ListingQuery): string {
  const sp = new URLSearchParams();
  if (query.q) sp.set('q', query.q);
  if (query.type) sp.set('type', query.type);
  if (query.area) sp.set('area', query.area);
  const s = sp.toString();
  return s ? `/?${s}` : '/';
}
