// Listing photos are cropped from the approved Option 3 reference until real photo storage exists.
// Slots 2 and 3 are different crops of the same reference photo so a listing never shows one image three times.
export type PhotoSlot = 1 | 2 | 3;
type Photo = { src: string; width: number; height: number };

const PHOTOS: Record<'kost' | 'kontrakan', Record<PhotoSlot, Photo>> = {
  kost: {
    1: { src: '/images/photo-kost.webp', width: 245, height: 216 },
    2: { src: '/images/photo-kost-2.webp', width: 308, height: 158 },
    3: { src: '/images/photo-kost-3.webp', width: 168, height: 158 },
  },
  kontrakan: {
    1: { src: '/images/photo-kontrakan.webp', width: 245, height: 225 },
    2: { src: '/images/photo-kontrakan-2.webp', width: 308, height: 166 },
    3: { src: '/images/photo-kontrakan-3.webp', width: 168, height: 166 },
  },
};

export function listingPhoto(type: 'kost' | 'kontrakan', slot: PhotoSlot = 1): Photo {
  return PHOTOS[type][slot];
}

/** Kept for existing callers that want the cover photo. */
export const LISTING_PHOTOS = { kost: PHOTOS.kost[1], kontrakan: PHOTOS.kontrakan[1] } as const;
