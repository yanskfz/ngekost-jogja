# Trust and Discovery iteration

Status: implemented on branch `claude/trust-discovery-iteration` (based on the PR #2 head). Not merged, not deployed.
Sources of truth (Product Owner / Codex, in Google Drive, not in this repository): `Ngekost-Jogja-Trust-and-Discovery-System-Design.docx` and `artifact.md`. This page records how the nine approved UI additions were implemented and every assumption made while doing so.

## Scope

The Product Owner approved nine UI additions. The Vercel preview stays dummy/read-only: no payments, deposits, booking, escrow, production auth, or hosted database.

| # | Addition | Where | Notes |
| --- | --- | --- | --- |
| 1 | Trust evidence row/badge | `components/listings/TrustBadges.tsx`, `lib/data/trust.ts` | Cards show only checks that passed. The detail page lists all five checks, marks missing ones "belum", and states it is not a safety guarantee. |
| 2 | Last-confirmed date and availability | `lib/format.ts`, card status line, detail status panel | Four availability values; on the detail page `unknown` reads "Ketersediaan belum dikonfirmasi", never "Tersedia". List cards merge availability and age into one line ("Tersedia · 10 hari lalu") using short wording; unknown shows "Belum pasti" because the full label does not fit on phones up to 375 px. The full wording stays in the tooltip and screen-reader text. |
| 3 | Approximate map preview and Open in Maps | `lib/location/*`, `components/listings/ApproxMap.tsx` | See "Location privacy". |
| 4 | Role badge and broker-fee transparency (narrowed by the Product Owner) | `lib/format.ts` (`brokerFeeNote`), cards, detail | Shown only when there is a fee or the fee is not stated: then the card and detail show "Agen" plus the fee note. Owner listings and agen listings with no fee show neither the role nor any "no fee" text. The role is still stored and visible to admins. |
| 5 | Report listing flow | `app/listing/[id]/laporkan`, `submitReport`, `lib/reporting/*` | Demo model: hides the listing for the reporter's browser only. |
| 6 | "Jadwalkan survei" WhatsApp template | `lib/whatsapp/survey.ts`, `components/listings/ContactActions.tsx` | Same consent gating as the WhatsApp button. |
| 7 | Expanded filters and sorting | `lib/search/listings.ts`, `components/listings/FilterPanel.tsx` | GET form, works without JavaScript. Price band, facilities, availability, and sort; the role filter was removed by the Product Owner (a leftover `?role=` is ignored). |
| 8 | Three-photo distinctness/content guidance | `components/trust/PhotoGuidance.tsx`, `lib/validation/photos.ts` | Structural validation only (see limits). |
| 9 | Revised concise consent modal | `components/trust/ConsentModal.tsx` | Three safety actions; consent version bumped to `2026-10-v2`. |

## Hard decisions (from the Product Owner) and how they are met

- **Never expose exact coordinates.** `PublicListing` has no exact latitude/longitude and no street address; it carries `approx_latitude`, `approx_longitude`, `approx_precision_m` and a neighborhood label. Cards, detail, the raw HTML/RSC payload, and map links are tested to contain neither the exact coordinates nor the private address.
- **Location precision 300–500 m.** `approximateLocation` (`lib/location/approximate.ts`) moves the point 312–488 m in a secret-keyed pseudo-random direction (so rounding to 4 decimals stays inside 300–500 m). It is deterministic per listing so reloads cannot be averaged to recover the real point. Unit tests check 900 samples across three secrets; E2E measures the shown point against the real one.
- **User geolocation is optional and one-shot.** Nothing asks on load. A tap on "Urutkan dari lokasi saya" calls `getCurrentPosition` once (never `watchPosition`), keeps the result in memory only, and sends nothing. Denied, unsupported, or failed lookups show a message; search and area filters work regardless.
- **Anonymous limit stays 3 of 5.** Unchanged and still applied server-side before search, filters, sorting, and reports.
- **Measure, do not A/B test consent.** Six anonymous events (see `docs/METRICS.md`). No experiment framework.
- **Reuse committed assets only.** No image was generated. Photo slots 2 and 3 of the dummy listings are different crops of the same two reference photos (`scripts/slice-assets.py`, `docs/DESIGN_ASSET_MANIFEST.md`).

## Data contract changes (`lib/data/types.ts`, `docs/DATA_MODEL.md`)

New or changed listing fields: `neighborhood_label` (public), `address` and `map_latitude/longitude` (now explicitly private), `availability` (`available | limited | unavailable | unknown`), `contact_reachability_status` (`reachable | unverified | failed`), `broker_fee_status` (`none | disclosed | undisclosed`) and `broker_fee_amount`. The SQLite schema, the dummy fixtures, and a dev-only `createReport` (idempotent per reporter, listing, and reason within 24 h; hides an approved listing at once) follow.

## Assumptions made (please confirm or correct)

1. **Evidence checks.** The five checks are: three photos, WhatsApp reachability (`contact_reachability_status = reachable`), verified email, admin review (`verification_status = verified`), and recorded publish/contact permission. They are derived only from stored facts.
2. **"Masih tersedia" filter** means availability `available` or `limited`; `unknown` and `unavailable` are excluded.
3. **Price bands** (below Rp 1 jt, Rp 1–2 jt, above Rp 2 jt per month) and monthly-equivalent comparison for yearly kontrakan prices are my choice, not from the documents.
4. **Sort options** are standard order, most recently confirmed, lowest price, highest price, plus the optional nearest sort.
5. **Facility filters** are WiFi, AC, kamar mandi, and parking/carport, matched by text against the dummy facility strings.
6. **Broker fee wording** states the declared amount and that Ngekost Jogja does not collect it; it does not say how the fee is paid. "No fee" is not displayed at all (Product Owner decision); a fee that is not stated is displayed, because "unknown" is not "none".
7. **Homepage copy.** The design document notes that "dari pemilik langsung" misstates a marketplace that also allows brokers, and that "terverifikasi" is broader than the evidence. The hero now reads "yang sudah ditinjau admin, dari pemilik atau agen", and the trust-card heading reads "Sebelum tayang, setiap listing diperiksa:". This departs from the earlier handoff wording ("verified kost and kontrakan") and needs Product Owner confirmation.
8. **Exact address** is never shown. The design says it is "restricted to the approved contact flow"; the preview does not implement that flow, and the map note tells visitors the owner or agen gives the full address after contact.
9. **Reports in the preview** only hide the listing for the reporter's own browser (cookie) and say so on screen. The hosted product must hide it for everyone and store the report durably.
10. **Consent modal wording.** The three actions follow the design's lifecycle section (inspect directly, never transfer before viewing, contact only through the displayed channel). The visible text is at most 55 words before the guide is opened.

## Product Owner change after the first visual review

- **List-card address is one line.** Cards show the kecamatan and region only (for example "Kec. Umbulharjo, Kota Jogja"), cut with an ellipsis if it still does not fit. The full neighborhood label stays on the detail page, in the card's tooltip, and in screen-reader text (`compactLocation` in `lib/format.ts`). Labels without a recognizable kecamatan fall back to their last two parts.
- Other card lines (title, evidence row, status row, fee note) are not capped yet; see the density options in the visual review.

## Product Owner decision: role and fee are shown only when there is a fee

The Product Owner decided that "no broker fee" needs no mention and that the role (agen or not) need not be shown either. Implemented as: the role badge and the fee line appear together, only for an agen listing whose fee is disclosed or not stated. This departs from the design document's wording that the role "must be shown honestly" and "never implied to be owner-only"; the data still records the role, the homepage copy still says listings come "dari pemilik atau agen", and the "Pemasang iklan" filter still exists. Whether that filter should stay while the role is mostly hidden is an open question in `BRIEF.md`.

## Further Product Owner decisions after QA

- The role filter ("Pemasang iklan") was removed.
- Dummy photos: accepted as labelled sample crops (the note on the detail gallery). Real distinct photos are still required before any real listing.
- Availability and the confirmation age share one line on list cards. Short card wording: Tersedia, Tersisa sedikit, Tidak tersedia, **Belum pasti** (unknown). "Belum pasti" is the implementer's shortening of the approved label and needs confirmation.

## Independent QA findings F1-F6 (handled)

| # | Handling |
| --- | --- |
| F1 photos are crops of one image | Not solvable in code without new imagery. The detail gallery now says the sample photos are crops of one example image and that real listings need three different photos. Real photos remain a go-live prerequisite. |
| F2 consent unusable without JavaScript | The modal explains that JavaScript is needed. The action stays disabled until the box is ticked (handoff requirement). |
| F3 `?status=ok` claimed a report that was never filed | The confirmation only renders for a listing this visitor actually reported; a filled honeypot now just re-shows the form. |
| F4 heading order on the locked page | The gate heading is an `h2` under the page `h1` on the locked detail page and an `h3` under the homepage's `h2`. |
| F5 404 without a landmark | `app/not-found.tsx` provides a header, `main`, `h1`, and a link home. |
| F6 inert location button without JavaScript | The control renders only after hydration. |
| F7 malformed percent-encoded path returns 502 | Platform behaviour (it fails the same way on a route that does not exist); not changed. |

## Not built (outside the nine additions or blocked by the dummy preview)

- Durable report storage, an admin response SLA, report triage, and per-user/listing/reason deduplication beyond the dev adapter and the cookie.
- Idempotent reconfirmation (`reconfirm` still extends the expiry each time it is applied).
- Perceptual or near-duplicate photo detection and any image analysis; only exact duplicate files and basic type/size rules are checked.
- Filter-to-detail and detail-to-WhatsApp click metrics (the design marks them "recommended").
- Rate limiting for reports and survey clicks (a honeypot field and input limits are the only controls).
- Any hosted auth, storage, RLS, or database.

## Decisions that still need the Product Owner

See the Open questions in `BRIEF.md`: report response SLA, broker "relationship" disclosure, price band thresholds, whether `unknown` availability should be allowed on approved listings, `LOCATION_JITTER_SECRET` provisioning, the homepage copy change above, and the analytics sink for production.
