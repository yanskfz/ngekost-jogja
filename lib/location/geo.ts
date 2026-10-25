// Pure, client-safe geo helpers. The secret-keyed approximation lives in approximate.ts (server only).
export type LatLng = { latitude: number; longitude: number };

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_008.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** OpenStreetMap embed (opt-in iframe) and external map links, always built from the approximate point. */
export function osmEmbedUrl(p: LatLng): string {
  const d = 0.006;
  const bbox = [p.longitude - d, p.latitude - d, p.longitude + d, p.latitude + d].map((n) => n.toFixed(4)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
}
export function osmLink(p: LatLng): string {
  return `https://www.openstreetmap.org/?mlat=${p.latitude.toFixed(4)}&mlon=${p.longitude.toFixed(4)}#map=15/${p.latitude.toFixed(4)}/${p.longitude.toFixed(4)}`;
}
export function googleMapsLink(p: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
}
