import type { Availability, BrokerFeeStatus, SubmitterType } from '@/lib/data/types';

const DAY_MS = 24 * 60 * 60 * 1000;

const rupiahFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const formatRupiah = (n: number): string => rupiahFormat.format(n);

/** Whole days between two instants, never negative. */
export function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));
}

export function confirmedLabel(lastConfirmedAt: string | null, now: Date): string {
  if (!lastConfirmedAt) return 'Belum dikonfirmasi';
  const days = daysSince(lastConfirmedAt, now);
  if (days === 0) return 'Dikonfirmasi hari ini';
  if (days === 1) return 'Dikonfirmasi kemarin';
  if (days <= 30) return `Dikonfirmasi ${days} hari lalu`;
  return `Dikonfirmasi ${Math.floor(days / 30)} bulan lalu`;
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

/** Whether a listing may be offered under the "masih tersedia" filter. */
export const isStillAvailable = (a: Availability): boolean => a === 'available' || a === 'limited';

export const ROLE_LABEL: Record<SubmitterType, string> = { owner: 'Pemilik', broker: 'Agen' };

export type FeeNote = { text: string; tone: 'ok' | 'warn' };

/** Broker-fee transparency. Ngekost Jogja never collects the fee; this only states what the submitter declared. */
export function brokerFeeNote(role: SubmitterType, status: BrokerFeeStatus, amount: number | null): FeeNote {
  if (role === 'owner') return { text: 'Pemilik langsung, tanpa biaya makelar', tone: 'ok' };
  if (status === 'none') return { text: 'Tanpa biaya makelar', tone: 'ok' };
  if (status === 'disclosed' && amount !== null) return { text: `Biaya makelar ${formatRupiah(amount)}. Ngekost Jogja tidak memungut biaya ini`, tone: 'warn' };
  return { text: 'Biaya makelar belum dicantumkan. Tanyakan sebelum survei', tone: 'warn' };
}
