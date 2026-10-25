import Link from 'next/link';
import { ChevronRight, House, ImageIcon, MessageCircle, Search, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/site/Header';
import { ListingCard } from '@/components/listings/ListingCard';
import { AntiScamWarning } from '@/components/trust/AntiScamWarning';
import { listPreviewCards } from '@/lib/data/preview';
import { areaLabel, filterListings, parseListingQuery, toQueryString, type ListingQuery } from '@/lib/search/listings';

// Evaluate expiry per request so dummy listings never look stale.
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function Chip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link href={href} className={active ? 'chip chip--active' : 'chip'} aria-current={active ? 'true' : undefined} scroll={false}>
      {label}
    </Link>
  );
}

export default async function HomePage({ searchParams }: Props) {
  const query = parseListingQuery(await searchParams);
  const all = listPreviewCards();
  const results = filterListings(all, query);
  const filtered = Boolean(query.q || query.type || query.area);
  const withQuery = (patch: Partial<ListingQuery>) => `${toQueryString({ ...query, ...patch })}#listing`;

  return (
    <>
      <Header />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <h1 id="hero-title">Temukan tempat tinggal nyaman di Jogja</h1>
          <p>Kost dan kontrakan terverifikasi di Sleman dan Kota Jogja, dari pemilik langsung.</p>
          <svg className="hero__art" viewBox="0 0 160 110" aria-hidden="true" focusable="false">
            <path d="M0 110 L50 40 L90 85 L120 55 L160 110Z" fill="#cfe0c4" />
            <path d="M70 110V50l10-30 10 30v60z" fill="#fff6d6" stroke="#b8932c" strokeWidth="2" />
          </svg>
        </section>

        <form className="search" role="search" action="/#listing" method="get">
          <label htmlFor="q" className="sr-only">
            Cari lokasi, kampus, atau wilayah
          </label>
          <Search size={22} aria-hidden="true" />
          <input id="q" name="q" type="search" placeholder="Cari lokasi, kampus, atau wilayah…" defaultValue={query.q ?? ''} autoComplete="off" />
          {query.type ? <input type="hidden" name="type" value={query.type} /> : null}
          {query.area ? <input type="hidden" name="area" value={query.area} /> : null}
          <button type="submit">Cari</button>
        </form>

        <nav className="categories" aria-label="Kategori">
          <Link href="/?type=kost#listing" className="category category--kost">
            <House size={40} aria-hidden="true" />
            <span>
              <strong>Cari Kost</strong>
              <small>Kamar nyaman, lingkungan aman</small>
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </Link>
          <Link href="/?type=kontrakan#listing" className="category category--kontrakan">
            <House size={40} aria-hidden="true" />
            <span>
              <strong>Cari Kontrakan</strong>
              <small>Untuk keluarga, pasangan, atau teman</small>
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </Link>
        </nav>

        <section className="trust" aria-labelledby="trust-title">
          <h2 id="trust-title">Semua listing di Ngekost Jogja melalui proses verifikasi:</h2>
          <ul>
            <li>
              <ImageIcon size={28} aria-hidden="true" />
              <span>
                <strong>Minimal 3 foto</strong>
                <small>Lihat kondisi aslinya</small>
              </span>
            </li>
            <li>
              <MessageCircle size={28} aria-hidden="true" />
              <span>
                <strong>WhatsApp bisa dihubungi</strong>
                <small>Langsung chat ke pemilik</small>
              </span>
            </li>
            <li>
              <ShieldCheck size={28} aria-hidden="true" />
              <span>
                <strong>Di-review admin</strong>
                <small>Informasi lebih terpercaya</small>
              </span>
            </li>
          </ul>
        </section>

        <p className="notice" role="note">
          <strong>Preview dengan data contoh.</strong> Semua listing adalah data dummy dan read-only; tidak ada pengiriman,
          laporan, atau moderasi yang disimpan.
        </p>

        <section id="listing" aria-labelledby="listing-title" className="listings">
          <h2 id="listing-title">{filtered ? 'Hasil pencarian' : 'Rekomendasi di sekitar kamu'}</h2>
          <div className="chips" role="group" aria-label="Filter">
            <Chip label="Semua jenis" href={withQuery({ type: undefined })} active={!query.type} />
            <Chip label="Kost" href={withQuery({ type: 'kost' })} active={query.type === 'kost'} />
            <Chip label="Kontrakan" href={withQuery({ type: 'kontrakan' })} active={query.type === 'kontrakan'} />
            <Chip label="Semua area" href={withQuery({ area: undefined })} active={!query.area} />
            <Chip label={areaLabel('sleman')} href={withQuery({ area: 'sleman' })} active={query.area === 'sleman'} />
            <Chip label={areaLabel('kota_jogja')} href={withQuery({ area: 'kota_jogja' })} active={query.area === 'kota_jogja'} />
          </div>
          <p className="count" role="status">
            {results.length} listing ditemukan
          </p>
          {results.length > 0 ? (
            <ul className="cards">
              {results.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} priority={i === 0} />
              ))}
            </ul>
          ) : (
            <div className="empty">
              <p>
                <strong>Belum ada listing yang cocok.</strong>
              </p>
              <p>Coba kata kunci lain atau hapus filter.</p>
              <Link href="/#listing" className="button">
                Hapus pencarian
              </Link>
            </div>
          )}
        </section>

        <AntiScamWarning id="keamanan" />
      </main>
      <footer className="footer">
        <p>Jogja tetap istimewa kalau kamu tinggal di tempat yang tepat.</p>
      </footer>
    </>
  );
}
