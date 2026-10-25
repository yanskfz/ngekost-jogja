import { notFound } from 'next/navigation';
import { ListingCard } from '@/components/listings/ListingCard';
import { consentMissing } from '@/lib/safety/consent';
import type { ListingCardData } from '@/lib/search/listings';

export const dynamic = 'force-dynamic';

const base: ListingCardData = {
  id: 'qa-1',
  title: 'Kost Contoh',
  type: 'kost',
  area: 'sleman',
  address: 'Jl. Contoh No. 1, Sleman',
  map_latitude: -7.77,
  map_longitude: 110.38,
  price_monthly: 900000,
  price_period: 'bulan',
  deposit_information: null,
  facilities: ['1 kamar', 'WiFi', 'AC'],
  condition_details: 'Contoh',
  role: 'owner',
  last_confirmed_at: null,
  expires_at: null,
};

/** Synthetic worst-case content for layout QA. Disabled unless QA_FIXTURES=1 (set only by the E2E runner). */
const QA_CARDS: ListingCardData[] = [
  { ...base, id: 'qa-long-title', title: 'Kost Putri Eksklusif Dekat Kampus Universitas Gadjah Mada dengan Fasilitas Lengkap dan Lingkungan Sangat Tenang Sekali', facilities: ['1 kamar', 'WiFi', 'AC'] },
  { ...base, id: 'qa-long-word', title: 'Kost' + 'Supercalifragilisticexpialidocious'.repeat(2), address: 'Jl.' + 'PanjangTanpaSpasi'.repeat(6) },
  { ...base, id: 'qa-long-address', type: 'kontrakan', price_monthly: 18000000, price_period: 'tahun', address: 'Perumahan Contoh Asri Blok C No. 12, RT 04 RW 09, Dusun Contoh Kidul, Kelurahan Contoh Lor, Kecamatan Depok, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55281' },
  { ...base, id: 'qa-no-facilities', title: 'Kost Tanpa Fasilitas Tercatat', facilities: [] },
  { ...base, id: 'qa-one-facility', title: 'Kost Satu Fasilitas', facilities: ['1 kamar'] },
  { ...base, id: 'qa-yearly-huge', type: 'kontrakan', title: 'Rumah Kontrakan Harga Tahunan Besar', price_monthly: 1250000000, price_period: 'tahun', facilities: ['3 kamar', '2 kamar mandi', 'Carport'] },
  { ...base, id: 'qa-monthly', type: 'kontrakan', title: 'Rumah Kontrakan Bulanan', price_monthly: 2500000, price_period: 'bulan', facilities: ['2 kamar', '1 kamar mandi', 'Carport'] },
];

export default async function QaCardsPage() {
  if (process.env.QA_FIXTURES !== '1') notFound();
  if (await consentMissing()) return null;
  return (
    <main>
      <h1>QA card fixtures</h1>
      <ul className="cards">
        {QA_CARDS.map((card) => (
          <ListingCard key={card.id} listing={card} />
        ))}
      </ul>
    </main>
  );
}
