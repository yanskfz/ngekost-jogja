import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarCheck, MapPin } from 'lucide-react';
import { ApproxMap } from '@/components/listings/ApproxMap';
import { ContactActions } from '@/components/listings/ContactActions';
import { FacilityIcon } from '@/components/listings/facility-icon';
import { listingPhoto, type PhotoSlot } from '@/components/listings/photos';
import { TrustPanel } from '@/components/listings/TrustBadges';
import { Header } from '@/components/site/Header';
import { ListingGate } from '@/components/trust/ListingGate';
import { PhotoGuidance } from '@/components/trust/PhotoGuidance';
import { isDemoSignedIn } from '@/lib/auth/demo-session';
import { canViewListing } from '@/lib/data/access';
import { getPreviewDetail, listPreviewCards } from '@/lib/data/preview';
import { AVAILABILITY_LABEL, ROLE_LABEL, brokerFeeNote, formatDateId, formatRupiah } from '@/lib/format';
import { getReportedIds } from '@/lib/reporting/cookie';
import { consentMissing } from '@/lib/safety/consent';
import { areaLabel } from '@/lib/search/listings';

export const dynamic = 'force-dynamic';

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  if (await consentMissing()) return null;
  const { id } = await params;
  const reported = await getReportedIds();
  const publicListings = listPreviewCards(new Date(), reported);
  if (!publicListings.some((l) => l.id === id)) notFound();
  // Server-side gate: a locked listing's data is never read, so direct URLs cannot expose it.
  if (!canViewListing(publicListings, id, await isDemoSignedIn())) {
    return (
      <>
        <Header />
        <main className="detail">
          <Link href="/#listing" className="back">
            <ArrowLeft size={18} aria-hidden="true" /> Kembali
          </Link>
          <h1>Listing ini terkunci</h1>
          <ListingGate lockedCount={1} headingLevel={2} />
        </main>
      </>
    );
  }
  const detail = getPreviewDetail(id, new Date(), reported);
  if (!detail) notFound();
  const { listing, contactWhatsapp, imageCount, evidence, confirmed_label } = detail;
  const fee = brokerFeeNote(listing.role, listing.broker_fee_status, listing.broker_fee_amount);
  const availableOk = listing.availability === 'available' || listing.availability === 'limited';

  return (
    <>
      <Header />
      <main className="detail">
        <Link href="/#listing" className="back">
          <ArrowLeft size={18} aria-hidden="true" /> Kembali
        </Link>
        <h1>{listing.title}</h1>
        <p className="card__meta">
          <span className={`tag tag--${listing.type}`}>{listing.type === 'kost' ? 'Kost' : 'Kontrakan'}</span>
          {fee ? <span className={`tag tag--role tag--${listing.role}`}>{ROLE_LABEL[listing.role]}</span> : null}
          <span className="card__area">
            <MapPin size={14} aria-hidden="true" /> {areaLabel(listing.area)} · {listing.neighborhood_label}
          </span>
        </p>
        <div className="gallery" data-testid="gallery">
          {Array.from({ length: imageCount }, (_, i) => {
            const slot = (i + 1) as PhotoSlot;
            const photo = listingPhoto(listing.type, slot);
            return (
              <img
                key={slot}
                src={photo.src}
                alt={`Foto contoh ${slot} dari ${imageCount}`}
                width={photo.width}
                height={photo.height}
                loading={slot === 1 ? 'eager' : 'lazy'}
                decoding="async"
              />
            );
          })}
        </div>
        <p className="gallery-note" data-testid="gallery-note">
          Foto contoh: ketiga foto ini potongan dari gambar contoh yang sama karena ini data dummy. Listing asli wajib memiliki tiga foto yang berbeda.
        </p>
        <p className="card__price">
          <span className="card__amount">{formatRupiah(listing.price_monthly)}</span> <span className="card__period">/ {listing.price_period}</span>
        </p>
        {listing.deposit_information ? <p>{listing.deposit_information}</p> : null}

        <section className="status-panel" aria-label="Status listing" data-testid="status-panel">
          <p>
            <span className={`avail avail--${availableOk ? 'ok' : 'muted'}`}>{AVAILABILITY_LABEL[listing.availability]}</span>
          </p>
          <p>
            <CalendarCheck size={16} aria-hidden="true" />{' '}
            {listing.last_confirmed_at ? `Terakhir dikonfirmasi ${formatDateId(listing.last_confirmed_at)} (${confirmed_label.replace('Dikonfirmasi ', '')})` : 'Belum dikonfirmasi'}
          </p>
          {listing.expires_at ? <p>Tayang sampai {formatDateId(listing.expires_at)} kecuali dikonfirmasi ulang.</p> : null}
          {fee ? (
            <p className={`card__fee card__fee--${fee.tone}`} data-testid="fee-note">
              {ROLE_LABEL[listing.role]}: {fee.text}
            </p>
          ) : null}
        </section>

        <TrustPanel items={evidence} />
        <PhotoGuidance />

        <h2>Fasilitas</h2>
        {listing.facilities.length > 0 ? (
          <ul className="facilities">
            {listing.facilities.map((f) => (
              <li key={f}>
                <FacilityIcon name={f} /> {f}
              </li>
            ))}
          </ul>
        ) : (
          <p>Fasilitas belum dicantumkan.</p>
        )}
        <h2>Kondisi</h2>
        <p>{listing.condition_details}</p>
        <p>Kontak: {listing.contact_name}</p>

        <ApproxMap point={{ latitude: listing.approx_latitude, longitude: listing.approx_longitude }} precisionM={listing.approx_precision_m} label={listing.neighborhood_label} />

        <ContactActions listingId={listing.id} title={listing.title} neighborhood={listing.neighborhood_label} contactName={listing.contact_name} whatsapp={contactWhatsapp} />
        <p className="notice" role="note">
          Preview dengan data contoh: nomor WhatsApp adalah nomor dummy dan tidak ada data yang disimpan.
        </p>
      </main>
    </>
  );
}
