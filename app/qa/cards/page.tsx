import { notFound } from 'next/navigation';
import { ListingCard } from '@/components/listings/ListingCard';
import { consentMissing } from '@/lib/safety/consent';
import type { TrustItem } from '@/lib/data/trust';
import type { ListingCardData } from '@/lib/search/listings';

export const dynamic = 'force-dynamic';

const ALL_OK: TrustItem[] = [
  { key: 'photos', label: '3 foto lengkap', short: '3 foto', ok: true },
  { key: 'whatsapp', label: 'WhatsApp bisa dihubungi', short: 'WA bisa dihubungi', ok: true },
  { key: 'email', label: 'Email terverifikasi', short: 'Email', ok: true },
  { key: 'admin', label: 'Ditinjau admin', short: 'Ditinjau admin', ok: true },
  { key: 'permission', label: 'Izin tayang tercatat', short: 'Izin tayang', ok: true },
];

const base: ListingCardData = {
  id: 'qa-1',
  title: 'Kost Contoh',
  type: 'kost',
  area: 'sleman',
  neighborhood_label: 'Caturtunggal, Kec. Depok, Kab. Sleman',
  approx_latitude: -7.77,
  approx_longitude: 110.38,
  approx_precision_m: 500,
  price_monthly: 900000,
  price_period: 'bulan',
  deposit_information: null,
  facilities: ['1 kamar', 'WiFi', 'AC'],
  condition_details: 'Contoh',
  role: 'owner',
  availability: 'available',
  contact_reachability_status: 'reachable',
  broker_fee_status: 'none',
  broker_fee_amount: null,
  last_confirmed_at: null,
  expires_at: null,
  evidence: ALL_OK,
  confirmed_label: 'Dikonfirmasi 5 hari lalu',
  confirmed_short: '5 hari lalu',
};

/** Synthetic worst-case content for layout QA. Disabled unless QA_FIXTURES=1 (set only by the E2E runner). */
const QA_CARDS: ListingCardData[] = [
  { ...base, id: 'qa-long-title', title: 'Kost Putri Eksklusif Dekat Kampus Universitas Gadjah Mada dengan Fasilitas Lengkap dan Lingkungan Sangat Tenang Sekali' },
  { ...base, id: 'qa-long-word', title: 'Kost' + 'Supercalifragilisticexpialidocious'.repeat(2), neighborhood_label: 'Jl.' + 'PanjangTanpaSpasi'.repeat(6) },
  { ...base, id: 'qa-long-address', type: 'kontrakan', role: 'broker', broker_fee_status: 'disclosed', broker_fee_amount: 1500000, price_monthly: 18000000, price_period: 'tahun', neighborhood_label: 'Perumahan Contoh Asri Blok C, RT 04 RW 09, Dusun Contoh Kidul, Kelurahan Contoh Lor, Kecamatan Depok, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55281' },
  { ...base, id: 'qa-no-facilities', title: 'Kost Tanpa Fasilitas Tercatat', facilities: [] },
  { ...base, id: 'qa-one-facility', title: 'Kost Satu Fasilitas', facilities: ['1 kamar'] },
  { ...base, id: 'qa-yearly-huge', type: 'kontrakan', title: 'Rumah Kontrakan Harga Tahunan Besar', price_monthly: 1250000000, price_period: 'tahun', facilities: ['3 kamar', '2 kamar mandi', 'Carport'] },
  { ...base, id: 'qa-monthly', type: 'kontrakan', title: 'Rumah Kontrakan Bulanan', price_monthly: 2500000, price_period: 'bulan', facilities: ['2 kamar', '1 kamar mandi', 'Carport'] },
  { ...base, id: 'qa-no-evidence', title: 'Kost Tanpa Bukti Tercatat', evidence: ALL_OK.map((e) => ({ ...e, ok: false })), last_confirmed_at: null, confirmed_label: 'Belum dikonfirmasi', confirmed_short: null, availability: 'unknown' },
  { ...base, id: 'qa-broker-undisclosed', title: 'Kost Agen Biaya Belum Dicantumkan dengan Judul yang Cukup Panjang', role: 'broker', broker_fee_status: 'undisclosed', availability: 'limited' },
  { ...base, id: 'qa-unavailable', title: 'Kost Tidak Tersedia', availability: 'unavailable' },
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
