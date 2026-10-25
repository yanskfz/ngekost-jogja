'use client';

import { useState } from 'react';
import { ExternalLink, Map as MapIcon } from 'lucide-react';
import { googleMapsLink, osmEmbedUrl, osmLink, type LatLng } from '@/lib/location/geo';

/**
 * Approximate-area preview. The point is already jittered on the server (300–500 m); this component only ever sees
 * that point. The OpenStreetMap frame loads only after a tap, so nothing is requested from a third party by default.
 */
export function ApproxMap({ point, precisionM, label }: { point: LatLng; precisionM: number; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="map" aria-labelledby="map-title">
      <h2 id="map-title">Perkiraan lokasi</h2>
      <div className="map__frame">
        {open ? (
          <iframe title={`Peta perkiraan lokasi sekitar ${label}`} src={osmEmbedUrl(point)} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" />
        ) : (
          <svg viewBox="0 0 200 120" role="img" aria-label={`Area perkiraan sekitar ${label}, radius sekitar ${precisionM} meter`}>
            <rect width="200" height="120" fill="#eef3e8" />
            <circle cx="100" cy="60" r="46" fill="#fdd76b" fillOpacity="0.35" stroke="#21613c" strokeWidth="2" strokeDasharray="5 4" />
            <circle cx="100" cy="60" r="4" fill="#21613c" />
          </svg>
        )}
      </div>
      <p className="map__note">
        Area sekitar <strong>{label}</strong>, ± {precisionM} m. Lokasi persis tidak ditampilkan. Alamat lengkap diberikan pemilik atau agen setelah kamu menghubungi.
      </p>
      <div className="map__actions">
        <button type="button" className="map__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <MapIcon size={16} aria-hidden="true" /> {open ? 'Sembunyikan peta' : 'Tampilkan peta'}
        </button>
        <a className="map__btn" href={osmLink(point)} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} aria-hidden="true" /> Buka di OpenStreetMap
        </a>
        <a className="map__btn" href={googleMapsLink(point)} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} aria-hidden="true" /> Buka di Google Maps
        </a>
      </div>
    </section>
  );
}
