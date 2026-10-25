# Ngekost Jogja MVP

Prototype product-first untuk marketplace kost dan kontrakan Jogja.

## Run locally

```bash
npm run dev
```

Buka `http://localhost:4173`.

Data demo tersimpan di browser `localStorage`, sehingga refresh tidak menghilangkan perubahan. Gunakan tombol **Reset demo data** pada panel admin untuk mengembalikan data awal.

## Deploy ke Vercel

Project ini sudah disiapkan sebagai static site dengan `vercel.json`. Import folder/repository ini di Vercel, gunakan default settings, dan set **Output Directory** ke `public` bila Vercel memintanya. Tidak ada database atau environment variable yang diperlukan untuk prototype ini.

Catatan: data posting, approval, dan import masih tersimpan di browser masing-masing. Sebelum public launch, pindahkan storage ke database hosted agar semua user melihat data yang sama.

## What's included

- Public listing search/filter.
- Listing detail + WhatsApp CTA.
- Owner post/edit flow dengan publish/contact consent.
- Admin moderation queue.
- CSV preview dan import dengan status pending.
- Privacy note dan consent metadata.

## Next production step

Ganti storage adapter di `public/app.js` dengan API/database layer, lalu tambahkan auth dan object storage. UI sengaja dipisahkan dari data contract agar migrasi ini tetap kecil.

