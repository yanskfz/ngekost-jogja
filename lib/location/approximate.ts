import { createHmac } from 'node:crypto';
import type { LatLng } from '@/lib/location/geo';

export const MIN_OFFSET_M = 300;
export const MAX_OFFSET_M = 500;
// Keep the pre-rounding radius inside the band so rounding to 4 decimals (~11 m) cannot push it outside 300–500 m.
const SAFE_MIN_M = 312;
const SAFE_MAX_M = 488;
const METERS_PER_DEGREE_LAT = 111_320;

// Dummy-data fallback only. Real listings need LOCATION_JITTER_SECRET: without a secret the offset can be recomputed
// from the listing id and subtracted to recover the exact point (see docs/TRUST_AND_DISCOVERY.md).
const DEV_FALLBACK_SECRET = 'dev-only-location-jitter-secret';

export function readJitterSecret(source: Record<string, string | undefined> = process.env): string {
  const secret = source.LOCATION_JITTER_SECRET?.trim();
  return secret ? secret : DEV_FALLBACK_SECRET;
}

/**
 * Deterministic, secret-keyed jitter: a point 300–500 m from the real location in a pseudo-random direction.
 * Deterministic so reloads do not move the pin (repeated sampling would otherwise average the jitter away).
 */
export function approximateLocation(id: string, exact: LatLng, secret: string = readJitterSecret()): LatLng {
  const digest = createHmac('sha256', secret).update(`approx-location:${id}`).digest();
  const u1 = digest.readUInt32BE(0) / 0x1_0000_0000;
  const u2 = digest.readUInt32BE(4) / 0x1_0000_0000;
  const angle = u1 * 2 * Math.PI;
  const radius = SAFE_MIN_M + u2 * (SAFE_MAX_M - SAFE_MIN_M);
  const dLat = (radius * Math.cos(angle)) / METERS_PER_DEGREE_LAT;
  const dLng = (radius * Math.sin(angle)) / (METERS_PER_DEGREE_LAT * Math.cos((exact.latitude * Math.PI) / 180));
  const round = (v: number) => Math.round(v * 10_000) / 10_000;
  return { latitude: round(exact.latitude + dLat), longitude: round(exact.longitude + dLng) };
}
