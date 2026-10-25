# Ngekost Jogja — Project Brief

## Status

- Stage: requirements locked; implementation plan ready for approval.
- Repository: `yanskfz/ngekost-jogja`, public, default branch `main`.
- Workflow: Agent OS + Claude Code implementation after plan approval.
- Hosting direction: Vercel first; Supabase is the recommended production data/auth/storage layer.
- Date: 2026-10-25.

## Open questions

- [x] Map provider — use OpenStreetMap-compatible maps for MVP.
- [x] Owner/broker verification — use declared role plus admin verification; do not claim guaranteed ownership.
- [x] Fraud report handling — report immediately hides the listing while admin investigates.
- [x] Expiry — hide automatically after 2 months; allow reconfirmation.
- [x] Admin auth — start with one admin account using email plus WhatsApp reachability verification.
- [x] WhatsApp verification scope — admin-supervised manual reachability check for MVP; automated OTP is deferred.

## Next step

Review `IMPLEMENTATION_PLAN.md`. After approval, hand off the scoped tasks to Claude Code starting with the foundation/data model task.

## Decisions

- 2026-10-25 — Start with Sleman and Kota Jogja as the initial service area.
- 2026-10-25 — Both property owners and brokers/makelar may submit listings.
- 2026-10-25 — Required listing inputs include 3 photos, Facebook URL when applicable, reachable WhatsApp number, detailed condition, map location, and a contactable name.
- 2026-10-25 — Owner/broker sign-in uses email plus admin-supervised WhatsApp reachability verification for MVP.
- 2026-10-25 — Admin has visibility and moderation control over every submitted listing; submitters manage only their own listings.
- 2026-10-25 — Listings hide automatically after 2 months unless reconfirmed.
- 2026-10-25 — MVP supports map, text search, and structured filters.
- 2026-10-25 — OpenStreetMap-compatible maps are the default MVP map direction.
- 2026-10-25 — MVP does not process subscriptions, payments, booking, escrow, deposits, or transfers.
- 2026-10-25 — Anti-scam safeguards are core: approval checks, prominent no-transfer warnings, report flow, immediate hide/review controls, and moderation audit events.
- 2026-10-25 — Publication of third-party listing information requires permission; Facebook URLs are provenance/reference data, not permission to copy without consent.
- 2026-10-25 — Requirements and acceptance criteria are locked before Claude Code implementation starts.

## Requirements

### Product

- Public, mobile-first marketplace for kost and kontrakan listings in Sleman and Kota Jogja.
- Owners and brokers/makelar can register with email and submit a WhatsApp number for admin reachability verification.
- Submitters can create and edit only their own listings.
- Admin can inspect, approve, reject, hide, archive, and bulk-import every listing.
- Public users can search by text, browse a map, and filter by area, type, price, facilities, role, and availability.
- Listing detail pages show condition details, 3 photos, map location, contact name, WhatsApp contact, and provenance URL when supplied.
- Users can contact the submitter through WhatsApp only after the listing is approved and contact consent exists.
- Every listing hides automatically after 2 months unless reconfirmed by the submitter/admin.

### Moderation and trust

A listing is not public until admin approval confirms, at minimum:

- submitter email is verified and WhatsApp reachability has been checked;
- publish and contact consent are recorded;
- the listing has 3 photos, a reachable WhatsApp number, contact name, detailed condition, and map location;
- location, price, type, and photos are coherent enough for review;
- owner/broker role is declared;
- third-party source URLs are retained for provenance and permission is confirmed before republication.

The product must:

- show a clear warning that Ngekost Jogja does not request or process transfer/payment and users must not transfer money before independent verification and viewing;
- never collect deposits, booking fees, admin fees, or payment credentials;
- provide “Report listing” with suspected scam, wrong location, unavailable listing, misleading price, or abuse reasons;
- immediately hide a reported listing while admin investigates;
- keep an audit trail of approval, rejection, hide, restore, expiry, reconfirmation, and report actions;
- avoid claiming that an approved listing is guaranteed safe or that Ngekost guarantees a transaction.

### Privacy and consent

- Record publish consent and contact consent with timestamp and consent text version.
- Store source, permission status, verification status, owner/broker role, and last-confirmed timestamp.
- Show only fields the submitter has allowed to be public.
- Provide correction and removal requests.
- Minimize personal data shown publicly.
- Do not scrape or republish third-party listings without permission.

### Delivery

- Vercel-compatible deployment.
- Recommended production stack: Next.js + TypeScript, Supabase Postgres/Auth/Storage, and OpenStreetMap-compatible map rendering.
- Production provider credentials/configuration must be documented without committing secrets.
- Claude Code is the implementation owner after the plan is approved.
- Each implementation task has explicit acceptance criteria and a narrow file scope.
- Review, QA, and deployment verification are separate quality gates.

## Data

### Listing

- id
- title
- type: kost | kontrakan
- area: sleman | kota_jogja
- address
- map_latitude
- map_longitude
- price_monthly
- deposit_information
- facilities
- condition_details
- images: exactly 3 required before approval
- contact_name
- contact_whatsapp
- source_url
- role: owner | broker
- status: draft | pending | approved | rejected | reported | hidden | expired | archived
- owner_id
- source
- permission_status
- verification_status
- last_confirmed_at
- expires_at
- created_at
- updated_at

### Account

- id
- email
- whatsapp
- role: submitter | admin
- submitter_type: owner | broker
- email_verified_at
- whatsapp_verified_at
- created_at

### Consent

- listing_id
- account_id
- publish_allowed
- contact_allowed
- consent_text_version
- captured_at
- privacy-preserving audit identifier

### Moderation event

- listing_id
- admin_id
- action: approve | reject | hide | restore | expire | reconfirm
- reason
- created_at

### Report

- listing_id
- reporter_contact_optional
- reason
- detail
- status: open | investigating | resolved | dismissed
- created_at
- resolved_at

## Done when

- [x] Product scope, non-goals, trust policy, and moderation checklist are approved.
- [x] Data contract and permission/status states are approved.
- [x] Agent OS plan has task-level acceptance criteria.
- [ ] Claude Code implements only approved tasks.
- [ ] Independent review passes.
- [ ] QA records executed results.
- [ ] Vercel deployment is verified read-only.
