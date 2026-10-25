import { listPreviewListings } from '@/lib/data/preview';

// Evaluate expiry per request so dummy listings never look stale.
export const dynamic = 'force-dynamic';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export default function HomePage() {
  const listings = listPreviewListings();
  return (
    <main>
      <h1>Ngekost Jogja</h1>
      <p role="note">
        <strong>Preview dengan data contoh.</strong> Semua listing di halaman ini adalah data dummy, bersifat read-only,
        dan tidak ada pengiriman, laporan, atau moderasi yang disimpan.
      </p>
      <p role="note">
        Ngekost Jogja tidak meminta atau memproses pembayaran. Jangan transfer uang sebelum survei langsung dan verifikasi mandiri.
      </p>
      <ul>
        {listings.map((listing) => (
          <li key={listing.id}>
            <strong>{listing.title}</strong> — {listing.type}, {listing.area === 'sleman' ? 'Sleman' : 'Kota Jogja'},{' '}
            {rupiah.format(listing.price_monthly)}/bulan
          </li>
        ))}
      </ul>
    </main>
  );
}
