import { REQUIRED_IMAGE_COUNT } from '@/lib/data/constants';

export const PHOTO_SLOTS = [
  { position: 1, title: 'Kamar atau ruang utama', hint: 'Foto seluruh kamar/ruang dari pintu, dengan pencahayaan jelas.' },
  { position: 2, title: 'Kamar mandi, dapur, atau fasilitas', hint: 'Bagian yang paling sering dipertanyakan: kamar mandi, dapur, AC, atau kasur.' },
  { position: 3, title: 'Tampak depan dan lingkungan', hint: 'Bangunan dari luar dan akses jalan, supaya mudah dicocokkan saat survei.' },
] as const;

export const PHOTO_RULES = [
  'Tiga foto harus berbeda: bukan foto yang sama diulang, dipotong, atau diberi filter.',
  'Foto asli dari properti ini, bukan foto stok, tangkapan layar iklan lain, atau foto dari internet.',
  'Tanpa nomor telepon, QR code, atau tulisan ajakan transfer di dalam foto.',
] as const;

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MIN_SHORT_SIDE_PX = 480;

export type PhotoInput = { storage_path: string; sha256?: string; mime?: string; width?: number; height?: number };

/**
 * Structural checks only: exact count, no duplicate file or content hash, allowed type, minimum size.
 * It cannot tell whether two different files show the same room; that needs image analysis and human review,
 * which are not built (see docs/TRUST_AND_DISCOVERY.md).
 */
export function validatePhotoSet(photos: PhotoInput[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (photos.length !== REQUIRED_IMAGE_COUNT) errors.push(`Perlu tepat ${REQUIRED_IMAGE_COUNT} foto (ada ${photos.length}).`);
  const paths = new Set(photos.map((p) => p.storage_path));
  if (paths.size !== photos.length) errors.push('Ada foto yang sama diunggah lebih dari sekali.');
  const hashes = photos.map((p) => p.sha256).filter((h): h is string => Boolean(h));
  if (new Set(hashes).size !== hashes.length) errors.push('Ada foto dengan isi file yang identik.');
  photos.forEach((p, i) => {
    if (p.mime && !(ALLOWED_MIME as readonly string[]).includes(p.mime)) errors.push(`Foto ${i + 1}: format ${p.mime} tidak diizinkan.`);
    if (p.width && p.height && Math.min(p.width, p.height) < MIN_SHORT_SIDE_PX) errors.push(`Foto ${i + 1}: sisi terpendek minimal ${MIN_SHORT_SIDE_PX}px.`);
  });
  return { ok: errors.length === 0, errors };
}
