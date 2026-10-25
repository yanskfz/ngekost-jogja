import { REPORT_REASONS, type ReportReason } from '@/lib/data/types';

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  suspected_scam: 'Dugaan penipuan',
  wrong_location: 'Lokasi tidak sesuai',
  unavailable: 'Sudah tidak tersedia',
  misleading_price: 'Harga menyesatkan',
  abuse: 'Konten tidak pantas atau penyalahgunaan',
};

export const MAX_DETAIL = 500;
export const MAX_CONTACT = 100;

export type ReportInput = { reason: ReportReason; detail: string | null; contact: string | null };
export type ReportResult =
  | { ok: true; input: ReportInput }
  | { ok: false; code: 'reason' | 'detail' | 'contact' | 'spam' };

function text(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Pure validation so it can be unit-tested; the server action only adds side effects. */
export function validateReport(form: Pick<FormData, 'get'>): ReportResult {
  if (text(form.get('website')) !== '') return { ok: false, code: 'spam' }; // honeypot: humans never see this field
  const reason = text(form.get('reason'));
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return { ok: false, code: 'reason' };
  const detail = text(form.get('detail'));
  if (detail.length > MAX_DETAIL) return { ok: false, code: 'detail' };
  const contact = text(form.get('contact'));
  if (contact.length > MAX_CONTACT) return { ok: false, code: 'contact' };
  return { ok: true, input: { reason: reason as ReportReason, detail: detail || null, contact: contact || null } };
}

export const REPORT_ERROR_TEXT: Record<'reason' | 'detail' | 'contact' | 'spam', string> = {
  reason: 'Pilih alasan laporan.',
  detail: `Keterangan maksimal ${MAX_DETAIL} karakter.`,
  contact: `Kontak maksimal ${MAX_CONTACT} karakter.`,
  spam: 'Laporan tidak dapat dikirim.',
};
