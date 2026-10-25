# Ngekost Jogja — Product Brief & MVP Scope

## Product brief

Ngekost Jogja adalah marketplace mobile-first gratis untuk membantu mahasiswa, pekerja, dan pendatang menemukan kost atau kontrakan yang relevan di Jogja tanpa harus menyisir banyak grup chat. Pemilik dapat memasang listing sendiri, atau mengirimkan data ke admin untuk dibantu onboarding.

### Launch thesis

Mulai dari supply lokal yang kecil tapi terpercaya: target 100–500 listing yang sudah mendapat izin publikasi. Kepercayaan dan kelengkapan data lebih penting daripada mengejar jumlah listing mentah.

### Primary users

- **Pencari:** butuh menemukan tempat tinggal berdasarkan area, harga, tipe, dan fasilitas lalu menghubungi pemilik lewat WhatsApp.
- **Pemilik/agen:** butuh cara gratis dan sederhana untuk mem-posting, mengedit, dan menerima inquiry.
- **Admin:** memoderasi data, mengecek consent, dan melakukan bulk import dari CSV.

### Non-goals untuk MVP

- Subscription, payment, escrow, booking, dan komisi transaksi.
- Scraping atau republication dari Facebook/grup tanpa izin eksplisit.
- Identity verification penuh atau rating/review kompleks.

## Phased MVP scope

### Phase 0 — Validation (sekarang)

- Landing + katalog listing contoh.
- Search/filter berdasarkan kata kunci, area, harga, tipe, dan fasilitas.
- CTA WhatsApp.
- Owner form dengan consent publish dan consent contact.
- Admin moderation queue, approve/reject, serta CSV preview/import.
- Local demo storage agar alur produk dapat diuji tanpa backend.

### Phase 1 — Private beta (100–200 permissioned listings)

- Auth owner/admin.
- Database hosted (Postgres/Supabase) + object storage untuk foto.
- Listing status: draft → pending → approved → rejected/archived.
- Audit log consent, source, verification, dan last confirmed.
- Form validation, duplicate detection, rate limiting, dan basic spam protection.

### Phase 2 — Public launch (200–500 listings)

- SEO landing pages per area.
- Saved search dan notification inquiry.
- Owner dashboard dengan analytics ringan.
- Admin workflow untuk expiry/reconfirm listing.
- Instrumentation: search-to-contact, listing freshness, approval rate, broken WhatsApp rate.

### Success metrics

- ≥100 listing approved dengan consent yang tercatat.
- ≥70% listing punya harga, area, foto/visual, dan kontak valid.
- Search-to-contact rate awal ≥5%.
- Median usia listing aktif <45 hari.

## Data contract inti

`listings`: id, title, type, area, address, price_monthly, deposit, facilities[], description, contact_whatsapp, images[], status, owner_name, source, permission_status, verification_status, last_confirmed_at, created_at, updated_at.

`consents`: listing_id, owner_id, publish_allowed, contact_allowed, consent_text_version, captured_at, ip_hash.

Privacy baseline: hanya tampilkan data yang diizinkan, minimalkan data pribadi, sediakan remove/update request, dan jangan import listing dari sumber pihak ketiga sebelum pemilik menyetujui publikasi.

