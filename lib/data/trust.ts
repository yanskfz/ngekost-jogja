import type { Account, Listing } from '@/lib/data/types';
import { REQUIRED_IMAGE_COUNT } from '@/lib/data/constants';

export type TrustKey = 'photos' | 'whatsapp' | 'email' | 'admin' | 'permission';
export type TrustItem = { key: TrustKey; label: string; short: string; ok: boolean };

export const TRUST_DISCLAIMER = 'Bukti ini membantu menilai iklan, bukan jaminan keamanan. Tetap survei langsung sebelum membayar apa pun.';

/**
 * Evidence is derived only from facts the system already records; nothing here is claimed beyond that.
 * `ok: false` items are returned too so the detail page can show what has NOT been checked.
 */
export function buildTrustEvidence(input: {
  imageCount: number;
  account: Pick<Account, 'email_verified_at'> | undefined;
  contact_reachability_status: Listing['contact_reachability_status'];
  verification_status: Listing['verification_status'];
  permission_status: Listing['permission_status'];
}): TrustItem[] {
  const { imageCount, account, contact_reachability_status, verification_status, permission_status } = input;
  return [
    { key: 'photos', label: `${REQUIRED_IMAGE_COUNT} foto lengkap`, short: `${REQUIRED_IMAGE_COUNT} foto`, ok: imageCount === REQUIRED_IMAGE_COUNT },
    { key: 'whatsapp', label: 'Nomor WhatsApp sudah dicek bisa dihubungi', short: 'WA bisa dihubungi', ok: contact_reachability_status === 'reachable' },
    { key: 'email', label: 'Email pengiklan terverifikasi', short: 'Email', ok: Boolean(account?.email_verified_at) },
    { key: 'admin', label: 'Ditinjau admin', short: 'Ditinjau admin', ok: verification_status === 'verified' },
    { key: 'permission', label: 'Izin tayang dan kontak tercatat', short: 'Izin tayang', ok: permission_status === 'granted' },
  ];
}
