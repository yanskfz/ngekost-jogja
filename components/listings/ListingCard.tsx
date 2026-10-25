import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import { FacilityIcon } from '@/components/listings/facility-icon';
import { areaLabel, type ListingCardData } from '@/lib/search/listings';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export function ListingCard({ listing, priority = false }: { listing: ListingCardData; priority?: boolean }) {
  const period = 'bulan';
  return (
    <li className="card">
      <div className="card__link">
        <img
          className="card__photo"
          src={`/images/placeholder-${listing.type}.svg`}
          alt=""
          width={400}
          height={300}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
        <div className="card__body">
          <p className="card__meta">
            <span className={`tag tag--${listing.type}`}>{listing.type === 'kost' ? 'Kost' : 'Kontrakan'}</span>
            <span className="card__area">
              <MapPin size={14} aria-hidden="true" /> {areaLabel(listing.area)}
            </span>
          </p>
          <h3 className="card__title">
            <Link href={`/listing/${listing.id}`} className="card__anchor">
              {listing.title}
            </Link>
          </h3>
          <ul className="facilities" aria-label="Fasilitas">
            {listing.facilities.slice(0, 3).map((f) => (
              <li key={f}>
                <FacilityIcon name={f} /> {f}
              </li>
            ))}
          </ul>
          <p className="card__price">
            {rupiah.format(listing.price_monthly)} <span>/ {period}</span>
          </p>
        </div>
        <ChevronRight className="card__chevron" size={22} aria-hidden="true" />
      </div>
    </li>
  );
}
