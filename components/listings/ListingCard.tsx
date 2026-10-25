import Link from 'next/link';
import { CalendarCheck, ChevronRight, MapPin, Navigation } from 'lucide-react';
import { FacilityIcon } from '@/components/listings/facility-icon';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { listingPhoto } from '@/components/listings/photos';
import { TrustRow } from '@/components/listings/TrustBadges';
import { AVAILABILITY_LABEL, ROLE_LABEL, brokerFeeNote, compactLocation, formatRupiah } from '@/lib/format';
import { areaLabel, type ListingCardData } from '@/lib/search/listings';

export function ListingCard({ listing, priority = false, distanceLabel }: { listing: ListingCardData; priority?: boolean; distanceLabel?: string }) {
  const photo = listingPhoto(listing.type, 1);
  // The role badge and fee line only appear together, and only when there is a fee (or an unknown fee) to flag.
  const fee = brokerFeeNote(listing.role, listing.broker_fee_status, listing.broker_fee_amount);
  const availabilityClass = listing.availability === 'available' || listing.availability === 'limited' ? 'ok' : 'muted';
  return (
    <li className="card" data-testid="listing-card" data-listing-id={listing.id}>
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
            {fee ? <span className={`tag tag--role tag--${listing.role}`}>{ROLE_LABEL[listing.role]}</span> : null}
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
            <span className="card__amount">{formatRupiah(listing.price_monthly)}</span> <span className="card__period">/ {listing.price_period}</span>
          </p>
          <p className="card__address" title={listing.neighborhood_label}>
            <MapPin size={14} aria-hidden="true" />
            <span className="card__address-text" aria-hidden="true">
              {compactLocation(listing.neighborhood_label)}
            </span>
            <span className="sr-only">{listing.neighborhood_label}</span>
          </p>
          <TrustRow items={listing.evidence} />
          <p className="card__status">
            <span className={`avail avail--${availabilityClass}`}>{AVAILABILITY_LABEL[listing.availability]}</span>
            <span className="card__confirmed">
              <CalendarCheck size={12} aria-hidden="true" /> {listing.confirmed_label}
            </span>
          </p>
          {fee ? <p className={`card__fee card__fee--${fee.tone}`}>{fee.text}</p> : null}
          {distanceLabel ? (
            <p className="card__distance" data-testid="distance">
              <Navigation size={12} aria-hidden="true" /> {distanceLabel}
            </p>
          ) : null}
        </div>
        <ChevronRight className="card__chevron" size={22} aria-hidden="true" />
      </div>
      <FavoriteButton id={listing.id} title={listing.title} />
    </li>
  );
}
