import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import { FacilityIcon } from '@/components/listings/facility-icon';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { LISTING_PHOTOS } from '@/components/listings/photos';
import { areaLabel, type ListingCardData } from '@/lib/search/listings';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export function ListingCard({ listing, priority = false }: { listing: ListingCardData; priority?: boolean }) {
  const photo = LISTING_PHOTOS[listing.type];
  return (
    <li className="card">
      <div className="card__link">
        <div className="card__photowrap">
          <img
            className="card__photo"
            src={photo.src}
            alt=""
            width={photo.width}
            height={photo.height}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
          />
        </div>
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
          {listing.facilities.length > 0 ? (
            <ul className="facilities" aria-label="Fasilitas">
              {listing.facilities.slice(0, 3).map((f) => (
                <li key={f}>
                  <FacilityIcon name={f} /> {f}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="card__price">
            <span className="card__amount">{rupiah.format(listing.price_monthly)}</span> <span className="card__period">/ {listing.price_period}</span>
          </p>
          <p className="card__address">
            <MapPin size={14} aria-hidden="true" /> {listing.address}
          </p>
        </div>
        <ChevronRight className="card__chevron" size={22} aria-hidden="true" />
      </div>
      <FavoriteButton id={listing.id} title={listing.title} />
    </li>
  );
}
