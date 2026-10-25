import { notFound } from 'next/navigation';
import { ApproxMap } from '@/components/listings/ApproxMap';
import { ContactActions } from '@/components/listings/ContactActions';
import { TrustPanel } from '@/components/listings/TrustBadges';
import { PhotoGuidance } from '@/components/trust/PhotoGuidance';
import { consentMissing } from '@/lib/safety/consent';

export const dynamic = 'force-dynamic';

const LONG = 'Kost Putri Eksklusif Dekat Kampus Universitas Gadjah Mada dengan Fasilitas Lengkap dan Lingkungan Sangat Tenang ' + 'Supercalifragilisticexpialidocious'.repeat(2);

/** Synthetic detail-page worst cases (nothing verified, long text, no contact consent). Disabled unless QA_FIXTURES=1. */
export default async function QaDetailPage() {
  if (process.env.QA_FIXTURES !== '1') notFound();
  if (await consentMissing()) return null;
  return (
    <main className="detail">
      <h1>{LONG}</h1>
      <TrustPanel
        items={[
          { key: 'photos', label: '3 foto lengkap', short: '3 foto', ok: false },
          { key: 'whatsapp', label: 'Nomor WhatsApp sudah dicek bisa dihubungi', short: 'WA bisa dihubungi', ok: false },
          { key: 'email', label: 'Email pengiklan terverifikasi', short: 'Email', ok: false },
          { key: 'admin', label: 'Ditinjau admin', short: 'Ditinjau admin', ok: false },
          { key: 'permission', label: 'Izin tayang dan kontak tercatat', short: 'Izin tayang', ok: false },
        ]}
      />
      <PhotoGuidance />
      <ApproxMap point={{ latitude: -7.7956, longitude: 110.3695 }} precisionM={500} label={'Perumahan Contoh Asri Blok C ' + 'PanjangTanpaSpasi'.repeat(5)} />
      <ContactActions listingId="lst-1" title={LONG} neighborhood="Contoh" contactName="Kontak Contoh" whatsapp={null} />
    </main>
  );
}
