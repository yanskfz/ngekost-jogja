import type { Availability, BrokerFeeStatus, SubmitterType } from '@/lib/data/types';

const DAY_MS = 24 * 60 * 60 * 1000;

const rupiahFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const formatRupiah = (n: number): string => rupiahFormat.format(n);

/** Whole days between two instants, never negative. */
export function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));
}

/** Age of the last confirmation without a verb ("10 hari lalu"), or null when there is none. Used on one-line cards. */
export function confirmedShort(lastConfirmedAt: string | null, now: Date): string | null {
  if (!lastConfirmedAt) return null;
  const days = daysSince(lastConfirmedAt, now);
  if (days === 0) return 'hari ini';
  if (days === 1) return 'kemarin';
  if (days <= 30) return `${days} hari lalu`;
  return `${Math.floor(days / 30)} bulan lalu`;
}

export function confirmedLabel(lastConfirmedAt: string | null, now: Date): string {
  const short = confirmedShort(lastConfirmedAt, now);
  return short ? `Dikonfirmasi ${short}` : 'Belum dikonfirmasi';
}

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
export const formatDateId = (iso: string): string => dateFormat.format(new Date(iso));

// Wording follows the approved design: "unknown" must never read as available.
export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Tersedia',
  limited: 'Tersisa sedikit',
  unavailable: 'Tidak tersedia',
  unknown: 'Ketersediaan belum dikonfirmasi',
};

/** Shorter wording for one-line cards. The detail page and screen-reader text keep the full labels above. */
export const AVAILABILITY_SHORT: Record<Availability, string> = {
  available: 'Tersedia',
  limited: 'Tersisa sedikit',
  unavailable: 'Tidak tersedia',
  unknown: 'Tanya dulu',
};

/** Whether a listing may be offered under the "masih tersedia" filter. */
export const isStillAvailable = (a: Availability): boolean => a === 'available' || a === 'limited';

export const ROLE_LABEL: Record<SubmitterType, string> = { owner: 'Pemilik', broker: 'Agen' };

export type FeeNote = { text: string; tone: 'ok' | 'warn' };

/**
 * Broker-fee transparency. Only a fee (or an unknown fee) is worth a visitor's attention, so "no fee" and owner
 * listings return null and nothing is shown, not even the role. Ngekost Jogja never collects the fee; the note only
 * states what the submitter declared.
 */
export function brokerFeeNote(role: SubmitterType, status: BrokerFeeStatus, amount: number | null): FeeNote | null {
  if (role === 'owner' || status === 'none') return null;
  if (status === 'disclosed' && amount !== null) return { text: `Biaya makelar ${formatRupiah(amount)}. Ngekost Jogja tidak memungut biaya ini`, tone: 'warn' };
  return { text: 'Biaya makelar belum dicantumkan. Tanyakan sebelum survei', tone: 'warn' };
}

const KEC = /^kec(?:amatan|\.)\s*(\S.*)$/i;
const REGION = /^(kab(?:upaten|\.)|kota)\s*(\S.*)$/i;

/**
 * Short, one-line location for list cards: "Kec. Umbulharjo, Kota Jogja". The full neighborhood label stays on the
 * detail page and in the card's tooltip and screen-reader text. Without a recognizable kecamatan it falls back to the
 * last two parts, so the result never has more than two parts.
 */
export function compactLocation(label: string): string {
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  const kecIndex = parts.findIndex((p) => KEC.test(p));
  if (kecIndex === -1) return parts.slice(-2).join(', ');
  const kec = `Kec. ${parts[kecIndex].match(KEC)![1]}`;
  const regionPart = parts.slice(kecIndex + 1).find((p) => REGION.test(p));
  if (!regionPart) return kec;
  const [, kind, name] = regionPart.match(REGION)!;
  const region = kind.toLowerCase().startsWith('kab') ? `Kab. ${name}` : `Kota ${name}`;
  return `${kec}, ${region}`;
}
