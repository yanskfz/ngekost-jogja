import Link from 'next/link';
import { Header } from '@/components/site/Header';

// Gives the default 404 a landmark, a heading, and a way home. Pages that call notFound() (hidden, expired, reported,
// or unknown listings) render this with a 404 status.
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="detail">
        <h1>Halaman tidak ditemukan</h1>
        <p>Halaman atau listing yang kamu cari tidak tersedia. Listing bisa saja sudah tayang habis, disembunyikan, atau dilaporkan.</p>
        <Link href="/" className="button">
          Kembali ke beranda
        </Link>
      </main>
    </>
  );
}
