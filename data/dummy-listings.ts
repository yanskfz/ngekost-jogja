import { computeExpiry } from '@/lib/data/rules';
import type { Account, Consent, DevData, Listing, ListingImage, ListingStatus, ModerationEvent } from '@/lib/data/types';

// Non-sensitive dummy data for the Vercel preview and local tests. Every name, address, email and phone number
// is invented: emails use the reserved .test TLD and phone numbers are obvious placeholders.

const DAY_MS = 24 * 60 * 60 * 1000;
const CONSENT_VERSION = 'dummy-2026-10';

type Seed = {
  n: number;
  title: string;
  type: Listing['type'];
  area: Listing['area'];
  /** Private exact address (never public). */
  address: string;
  /** Public neighborhood-level label. */
  neighborhood: string;
  lat: number;
  lng: number;
  price: number;
  period: Listing['price_period'];
  facilities: string[];
  status: ListingStatus;
  owner: string;
  role: Listing['role'];
  availability?: Listing['availability'];
  fee?: Listing['broker_fee_status'];
  feeAmount?: number;
  /** Days since last confirmation; expiry is derived with the real two-month rule. */
  confirmedDaysAgo: number | null;
  images: number;
};

const SEEDS: Seed[] = [
  { n: 1, title: 'Kost Puri Timoho', type: 'kost', area: 'kota_jogja', address: 'Jl. Timoho Contoh No. 1 (dummy)', neighborhood: 'Timoho, Kec. Umbulharjo, Kota Jogja', lat: -7.8014, lng: 110.3896, price: 1300000, period: 'bulan', facilities: ['1 kamar', 'WiFi', 'AC'], status: 'approved', owner: 'acc-owner-1', role: 'owner', availability: 'available', confirmedDaysAgo: 10, images: 3 },
  { n: 2, title: 'Rumah Kontrakan Sari Asri', type: 'kontrakan', area: 'sleman', address: 'Jl. Depok Contoh No. 2 (dummy)', neighborhood: 'Depok, Kec. Sleman, Kab. Sleman', lat: -7.7681, lng: 110.3777, price: 18000000, period: 'tahun', facilities: ['2 kamar', '1 kamar mandi', 'Carport'], status: 'approved', owner: 'acc-broker-1', role: 'broker', availability: 'unknown', fee: 'disclosed', feeAmount: 1500000, confirmedDaysAgo: 30, images: 3 },
  { n: 3, title: 'Kost Campur Contoh Anggrek', type: 'kost', area: 'kota_jogja', address: 'Jl. Contoh Anggrek No. 3 (dummy)', neighborhood: 'Terban, Kec. Gondokusuman, Kota Jogja', lat: -7.7829, lng: 110.3671, price: 1200000, period: 'bulan', facilities: ['1 kamar', 'WiFi', 'Kamar mandi dalam'], status: 'approved', owner: 'acc-owner-2', role: 'owner', availability: 'limited', confirmedDaysAgo: 55, images: 3 },
  { n: 4, title: 'Kost Putra Contoh Dahlia (menunggu review)', type: 'kost', area: 'sleman', address: 'Jl. Contoh Dahlia No. 4 (dummy)', neighborhood: 'Caturtunggal, Kec. Depok, Kab. Sleman', lat: -7.7592, lng: 110.3912, price: 750000, period: 'bulan', facilities: ['1 kamar', 'WiFi', 'Kamar mandi dalam'], status: 'pending', owner: 'acc-owner-1', role: 'owner', confirmedDaysAgo: null, images: 3 },
  { n: 5, title: 'Kost Contoh Teratai (disembunyikan)', type: 'kost', area: 'sleman', address: 'Jl. Contoh Teratai No. 5 (dummy)', neighborhood: 'Maguwoharjo, Kec. Depok, Kab. Sleman', lat: -7.7455, lng: 110.4021, price: 650000, period: 'bulan', facilities: ['1 kamar', 'WiFi', 'Kamar mandi dalam'], status: 'hidden', owner: 'acc-broker-1', role: 'broker', fee: 'undisclosed', confirmedDaysAgo: 20, images: 3 },
  { n: 6, title: 'Kontrakan Contoh Seruni (kedaluwarsa)', type: 'kontrakan', area: 'kota_jogja', address: 'Jl. Contoh Seruni No. 6 (dummy)', neighborhood: 'Mantrijeron, Kota Jogja', lat: -7.8102, lng: 110.3699, price: 3000000, period: 'bulan', facilities: ['1 kamar', 'WiFi', 'Kamar mandi dalam'], status: 'approved', owner: 'acc-owner-2', role: 'owner', confirmedDaysAgo: 75, images: 3 },
  { n: 7, title: 'Kost Contoh Kamboja (draft)', type: 'kost', area: 'kota_jogja', address: 'Jl. Contoh Kamboja No. 7 (dummy)', neighborhood: 'Kotabaru, Kec. Gondokusuman, Kota Jogja', lat: -7.7901, lng: 110.3601, price: 800000, period: 'bulan', facilities: ['1 kamar', 'WiFi', 'Kamar mandi dalam'], status: 'draft', owner: 'acc-owner-2', role: 'owner', confirmedDaysAgo: null, images: 1 },
  { n: 8, title: 'Kost Contoh Flamboyan (ditolak)', type: 'kost', area: 'sleman', address: 'Jl. Contoh Flamboyan No. 8 (dummy)', neighborhood: 'Sinduadi, Kec. Mlati, Kab. Sleman', lat: -7.7733, lng: 110.3855, price: 500000, period: 'bulan', facilities: ['1 kamar', 'WiFi', 'Kamar mandi dalam'], status: 'rejected', owner: 'acc-broker-1', role: 'broker', fee: 'disclosed', feeAmount: 500000, confirmedDaysAgo: null, images: 2 },
  { n: 9, title: 'Kost Putri Contoh Cempaka', type: 'kost', area: 'sleman', address: 'Jl. Contoh Cempaka No. 9 (dummy)', neighborhood: 'Condongcatur, Kec. Depok, Kab. Sleman', lat: -7.7612, lng: 110.3745, price: 950000, period: 'bulan', facilities: ['1 kamar', 'WiFi', 'Kamar mandi dalam'], status: 'approved', owner: 'acc-broker-1', role: 'broker', availability: 'available', fee: 'none', confirmedDaysAgo: 5, images: 3 },
  { n: 10, title: 'Rumah Kontrakan Contoh Mawar', type: 'kontrakan', area: 'kota_jogja', address: 'Jl. Contoh Mawar No. 10 (dummy)', neighborhood: 'Pakuncen, Kec. Wirobrajan, Kota Jogja', lat: -7.7975, lng: 110.3702, price: 21000000, period: 'tahun', facilities: ['3 kamar', '2 kamar mandi', 'Carport'], status: 'approved', owner: 'acc-broker-1', role: 'broker', availability: 'unavailable', fee: 'undisclosed', confirmedDaysAgo: 15, images: 3 },
];

export function buildDummyData(now: Date = new Date()): DevData {
  const iso = (d: Date) => d.toISOString();
  const ago = (days: number) => new Date(now.getTime() - days * DAY_MS);

  const accounts: Account[] = [
    { id: 'acc-admin-1', email: 'admin@example.test', whatsapp: '+62-800-0000-0000', role: 'admin', submitter_type: null, email_verified_at: iso(ago(90)), whatsapp_verified_at: iso(ago(90)), created_at: iso(ago(90)) },
    { id: 'acc-owner-1', email: 'owner1@example.test', whatsapp: '+62-800-0000-0001', role: 'submitter', submitter_type: 'owner', email_verified_at: iso(ago(80)), whatsapp_verified_at: iso(ago(79)), created_at: iso(ago(80)) },
    { id: 'acc-owner-2', email: 'owner2@example.test', whatsapp: '+62-800-0000-0002', role: 'submitter', submitter_type: 'owner', email_verified_at: iso(ago(80)), whatsapp_verified_at: iso(ago(78)), created_at: iso(ago(80)) },
    { id: 'acc-broker-1', email: 'broker1@example.test', whatsapp: '+62-800-0000-0003', role: 'submitter', submitter_type: 'broker', email_verified_at: iso(ago(80)), whatsapp_verified_at: iso(ago(77)), created_at: iso(ago(80)) },
  ];

  const listings: Listing[] = [];
  const images: ListingImage[] = [];
  const consents: Consent[] = [];
  const moderationEvents: ModerationEvent[] = [];

  for (const s of SEEDS) {
    const id = `lst-${s.n}`;
    const confirmedAt = s.confirmedDaysAgo === null ? null : ago(s.confirmedDaysAgo);
    listings.push({
      id,
      title: s.title,
      type: s.type,
      area: s.area,
      address: s.address,
      neighborhood_label: s.neighborhood,
      map_latitude: s.lat,
      map_longitude: s.lng,
      price_monthly: s.price,
      price_period: s.period,
      deposit_information: 'Informasi deposit contoh (dummy). Jangan transfer sebelum survei.',
      facilities: s.facilities,
      condition_details: 'Deskripsi kondisi contoh (dummy): kamar bersih, ventilasi baik, listrik dan air terpisah.',
      contact_name: `Kontak Contoh ${s.n}`,
      contact_whatsapp: `+62-800-0000-01${String(s.n).padStart(2, '0')}`,
      source_url: null,
      role: s.role,
      availability: s.availability ?? 'unknown',
      contact_reachability_status: s.status === 'approved' ? 'reachable' : 'unverified',
      broker_fee_status: s.role === 'broker' ? (s.fee ?? 'undisclosed') : 'none',
      broker_fee_amount: s.role === 'broker' && s.fee === 'disclosed' ? (s.feeAmount ?? null) : null,
      status: s.status,
      owner_id: s.owner,
      source: 'dummy-fixture',
      permission_status: 'granted',
      verification_status: s.status === 'approved' ? 'verified' : 'unverified',
      last_confirmed_at: confirmedAt ? iso(confirmedAt) : null,
      expires_at: confirmedAt ? iso(computeExpiry(confirmedAt)) : null,
      created_at: iso(ago(100)),
      updated_at: iso(ago(1)),
    });
    for (let p = 1; p <= s.images; p++) {
      images.push({ id: `img-${s.n}-${p}`, listing_id: id, position: p as 1 | 2 | 3, storage_path: `dummy/${id}/${p}.jpg`, created_at: iso(ago(100)) });
    }
    consents.push({
      id: `con-${s.n}`,
      listing_id: id,
      account_id: s.owner,
      publish_allowed: true,
      contact_allowed: true,
      consent_text_version: CONSENT_VERSION,
      captured_at: iso(ago(100)),
      audit_id: `audit-dummy-${s.n}`,
    });
    if (s.status === 'approved' || s.status === 'hidden' || s.status === 'rejected') {
      moderationEvents.push({
        id: `evt-${s.n}`,
        listing_id: id,
        admin_id: 'acc-admin-1',
        action: s.status === 'rejected' ? 'reject' : 'approve',
        reason: s.status === 'rejected' ? 'Foto tidak lengkap (dummy)' : null,
        created_at: iso(ago(s.confirmedDaysAgo ?? 5)),
      });
    }
    if (s.status === 'hidden') {
      moderationEvents.push({ id: `evt-${s.n}-hide`, listing_id: id, admin_id: 'acc-admin-1', action: 'hide', reason: 'Contoh penyembunyian (dummy)', created_at: iso(ago(2)) });
    }
  }

  return {
    accounts,
    listings,
    images,
    consents,
    moderationEvents,
    reports: [
      { id: 'rep-1', listing_id: 'lst-5', reporter_contact: null, reason: 'unavailable', detail: 'Laporan contoh (dummy)', status: 'investigating', created_at: iso(ago(3)), resolved_at: null },
    ],
    importBatches: [
      { id: 'imp-1', admin_id: 'acc-admin-1', filename: 'dummy-import.csv', row_count: 0, created_at: iso(ago(60)) },
    ],
  };
}
