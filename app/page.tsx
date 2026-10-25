import Link from 'next/link';
import { ArrowRight, ChevronRight, Search } from 'lucide-react';
import { Header } from '@/components/site/Header';
import { ListingCard } from '@/components/listings/ListingCard';
import { AntiScamWarning } from '@/components/trust/AntiScamWarning';
import { ListingGate } from '@/components/trust/ListingGate';
import { isDemoSignedIn } from '@/lib/auth/demo-session';
import { gateListings } from '@/lib/data/access';
import { listPreviewCards } from '@/lib/data/preview';
import { areaLabel, filterListings, parseListingQuery, toQueryString, type ListingQuery } from '@/lib/search/listings';

// Evaluate expiry per request so dummy listings never look stale.
import { consentMissing } from '@/lib/safety/consent';

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
  if (await consentMissing()) return null;
  const query = parseListingQuery(await searchParams);
  // The anonymous limit is applied to the global public set first, then search/filters run on what is allowed.
  const { allowed, lockedCount } = gateListings(listPreviewCards(), await isDemoSignedIn());
  const results = filterListings(allowed, query);
  const filtered = Boolean(query.q || query.type || query.area);
  const withQuery = (patch: Partial<ListingQuery>) => `${toQueryString({ ...query, ...patch })}#listing`;

  return (
    <>
      <Header />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <img className="hero__art" src="/images/hero.webp" alt="" width={273} height={260} fetchPriority="high" decoding="async" />
          <h1 id="hero-title">Temukan tempat tinggal nyaman di Jogja</h1>
          <p>Kost dan kontrakan terverifikasi di Sleman dan Kota Jogja, dari pemilik langsung.</p>
        </section>

        <form className="search" role="search" action="/#listing" method="get">
          <label htmlFor="q" className="sr-only">
            Cari lokasi, kampus, atau wilayah
          </label>
          <Search size={22} aria-hidden="true" />
          <input id="q" name="q" type="search" placeholder="Cari lokasi, kampus, atau wilayah…" defaultValue={query.q ?? ''} autoComplete="off" />
          {query.type ? <input type="hidden" name="type" value={query.type} /> : null}
          {query.area ? <input type="hidden" name="area" value={query.area} /> : null}
          <button type="submit">
            Cari <ArrowRight size={20} aria-hidden="true" />
          </button>
        </form>

        <nav className="categories" aria-label="Kategori">
          <Link href="/?type=kost#listing" className="category category--kost">
            <img src="/images/cat-kost.webp" alt="" width={100} height={104} decoding="async" />
            <span>
              <strong>
                Cari
                <br />
                Kost
              </strong>
              <small>Kamar nyaman, lingkungan aman</small>
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </Link>
          <Link href="/?type=kontrakan#listing" className="category category--kontrakan">
            <img src="/images/cat-kontrakan.webp" alt="" width={98} height={97} decoding="async" />
            <span>
              <strong>
                Cari
                <br />
                Kontrakan
              </strong>
              <small>Untuk keluarga, pasangan, atau teman</small>
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </Link>
        </nav>

        <section className="trust" aria-labelledby="trust-title">
          <h2 id="trust-title">Semua listing di Ngekost Jogja melalui proses verifikasi:</h2>
          <ul>
            <li>
              <img src="/images/trust-photo.webp" alt="" width={84} height={84} loading="lazy" decoding="async" />
              <span>
                <strong>Minimal 3 foto</strong>
                <small>Lihat kondisi aslinya</small>
              </span>
            </li>
            <li>
              <img src="/images/trust-whatsapp.webp" alt="" width={84} height={84} loading="lazy" decoding="async" />
              <span>
                <strong>WhatsApp bisa dihubungi</strong>
                <small>Langsung chat ke pemilik</small>
              </span>
            </li>
            <li>
              <img src="/images/trust-shield.webp" alt="" width={84} height={84} loading="lazy" decoding="async" />
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
          <div className="listings__head">
            <h2 id="listing-title">{filtered ? 'Hasil pencarian' : 'Rekomendasi di sekitar kamu'}</h2>
            <Link href="/#listing" className="listings__all">
              Lihat semua <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </div>
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
          {lockedCount > 0 ? <ListingGate lockedCount={lockedCount} /> : null}
        </section>

        <AntiScamWarning id="keamanan" />
      </main>
      <footer className="footer">
        <p className="footer__quote">
          Jogja tetap istimewa
          <br />
          kalau kamu tinggal di
          <br />
          tempat yang tepat.
        </p>
        <img className="footer__art" src="/images/footer-art.webp" alt="" width={481} height={196} loading="lazy" decoding="async" />
      </footer>
    </>
  );
}
