'use client';

import { useState } from 'react';
import { Crosshair, X } from 'lucide-react';
import { ListingCard } from '@/components/listings/ListingCard';
import { distanceMeters, type LatLng } from '@/lib/location/geo';
import type { ListingCardData } from '@/lib/search/listings';

type Status = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable' | 'error';

const STATUS_TEXT: Record<Exclude<Status, 'idle' | 'ok'>, string> = {
  asking: 'Meminta izin lokasi…',
  denied: 'Izin lokasi ditolak. Tidak apa-apa: kamu tetap bisa mencari lewat kolom pencarian dan filter area.',
  unavailable: 'Browser ini tidak mendukung lokasi. Gunakan pencarian dan filter area.',
  error: 'Lokasi tidak berhasil didapat. Gunakan pencarian dan filter area.',
};

function formatKm(meters: number): string {
  return `${(Math.round(meters / 100) / 10).toFixed(1).replace('.', ',')} km`;
}

/**
 * Optional "nearest" ordering. Location is requested once, only after a tap, kept in memory only, and never sent
 * anywhere. Distances are measured to the approximate listing point, so they are approximate too.
 */
export function ListingResults({ cards }: { cards: ListingCardData[] }) {
  const [status, setStatus] = useState<Status>('idle');
  const [here, setHere] = useState<LatLng | null>(null);

  function locate() {
    if (!navigator.geolocation?.getCurrentPosition) return setStatus('unavailable');
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setStatus('ok');
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 },
    );
  }

  function clear() {
    setHere(null);
    setStatus('idle');
  }

  const rows = cards.map((card) => ({ card, meters: here ? distanceMeters(here, { latitude: card.approx_latitude, longitude: card.approx_longitude }) : null }));
  if (here) rows.sort((a, b) => (a.meters ?? 0) - (b.meters ?? 0));

  return (
    <>
      <div className="nearby">
        {here ? (
          <button type="button" className="nearby__btn" onClick={clear}>
            <X size={16} aria-hidden="true" /> Hapus urutan terdekat
          </button>
        ) : (
          <button type="button" className="nearby__btn" onClick={locate} disabled={status === 'asking'}>
            <Crosshair size={16} aria-hidden="true" /> Urutkan dari lokasi saya
          </button>
        )}
        <p className="nearby__note">Opsional. Lokasi dipakai sekali di browser ini, tidak disimpan dan tidak dikirim ke server.</p>
        <p className="nearby__status" role="status">
          {status === 'ok' ? 'Diurutkan dari yang terdekat (perkiraan).' : status !== 'idle' ? STATUS_TEXT[status] : ''}
        </p>
      </div>
      <ul className="cards">
        {rows.map(({ card, meters }, i) => (
          <ListingCard key={card.id} listing={card} priority={i === 0} distanceLabel={meters === null ? undefined : `± ${formatKm(meters)} dari lokasimu`} />
        ))}
      </ul>
    </>
  );
}
