import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';
import {
  FACILITY_KEYS,
  FACILITY_LABEL,
  PRICE_BANDS,
  PRICE_BAND_LABEL,
  SORTS,
  SORT_LABEL,
  activeFilterCount,
  type ListingQuery,
} from '@/lib/search/listings';

/** GET form, so filters work without JavaScript and every state is a shareable URL. */
export function FilterPanel({ query }: { query: ListingQuery }) {
  const count = activeFilterCount(query);
  return (
    <details className="filters" open={count > 0 || Boolean(query.sort)}>
      <summary>
        <SlidersHorizontal size={18} aria-hidden="true" /> Filter &amp; urutkan{count > 0 ? ` (${count})` : ''}
      </summary>
      <form method="get" action="/#listing" className="filters__form">
        {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
        {query.type ? <input type="hidden" name="type" value={query.type} /> : null}
        {query.area ? <input type="hidden" name="area" value={query.area} /> : null}
        <div className="field">
          <label htmlFor="f-price">Harga per bulan</label>
          <select id="f-price" name="price" defaultValue={query.price ?? ''}>
            <option value="">Semua harga</option>
            {PRICE_BANDS.map((b) => (
              <option key={b} value={b}>
                {PRICE_BAND_LABEL[b]}
              </option>
            ))}
          </select>
          <small>Harga kontrakan tahunan dibandingkan per bulan.</small>
        </div>
        <fieldset className="field">
          <legend>Fasilitas</legend>
          <div className="field__checks">
            {FACILITY_KEYS.map((k) => (
              <label key={k} className="check">
                <input type="checkbox" name="fac" value={k} defaultChecked={query.fac?.includes(k)} /> {FACILITY_LABEL[k]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="check check--solo">
          <input type="checkbox" name="avail" value="1" defaultChecked={query.avail} /> Hanya yang masih tersedia
        </label>
        <div className="field">
          <label htmlFor="f-sort">Urutkan</label>
          <select id="f-sort" name="sort" defaultValue={query.sort ?? ''}>
            <option value="">{SORT_LABEL.default}</option>
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="filters__actions">
          <button type="submit" className="button">
            Terapkan
          </button>
          <Link href="/#listing" className="filters__reset">
            Reset semua
          </Link>
        </div>
      </form>
    </details>
  );
}
