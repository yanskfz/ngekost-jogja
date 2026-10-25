import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, MessageCircle } from 'lucide-react';
import { Header } from '@/components/site/Header';
import { FacilityIcon } from '@/components/listings/facility-icon';
import { AntiScamWarning } from '@/components/trust/AntiScamWarning';
import { getPreviewDetail } from '@/lib/data/preview';
import { LISTING_PHOTOS } from '@/components/listings/photos';
import { areaLabel } from '@/lib/search/listings';

export const dynamic = 'force-dynamic';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getPreviewDetail(id);
  if (!detail) notFound();
  const { listing, contactWhatsapp, imageCount } = detail;
  const photo = LISTING_PHOTOS[listing.type];
  const waNumber = contactWhatsapp?.replace(/\D/g, '');

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
          <span className="card__area">
            <MapPin size={14} aria-hidden="true" /> {areaLabel(listing.area)} · {listing.address}
          </span>
        </p>
        <div className="gallery">
          {Array.from({ length: imageCount }, (_, i) => (
            <img
              key={i}
              src={photo.src}
              alt={`Foto ${i + 1} dari ${imageCount}`}
              width={photo.width}
              height={photo.height}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          ))}
        </div>
        <p className="card__price">
          {rupiah.format(listing.price_monthly)} <span>/ {listing.price_period}</span>
        </p>
        {listing.deposit_information ? <p>{listing.deposit_information}</p> : null}
        <h2>Fasilitas</h2>
        <ul className="facilities">
          {listing.facilities.map((f) => (
            <li key={f}>
              <FacilityIcon name={f} /> {f}
            </li>
          ))}
        </ul>
        <h2>Kondisi</h2>
        <p>{listing.condition_details}</p>
        <p>
          Dipasang oleh {listing.role === 'owner' ? 'pemilik' : 'makelar'} · Kontak: {listing.contact_name}
        </p>

        <AntiScamWarning id="detail-warning" />

        {waNumber ? (
          <a className="button button--wa" href={`https://wa.me/${waNumber}`} rel="noopener noreferrer" target="_blank">
            <MessageCircle size={20} aria-hidden="true" /> Hubungi via WhatsApp
          </a>
        ) : (
          <p className="notice">Pemasang belum mengizinkan kontak lewat WhatsApp untuk listing ini.</p>
        )}
        <p className="notice" role="note">
          Preview dengan data contoh: nomor WhatsApp adalah nomor dummy dan tidak ada data yang disimpan.
        </p>
      </main>
    </>
  );
}
