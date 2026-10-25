# Ngekost Jogja — Project Brief

## Status

- Stage: Tasks 1 and 2 implemented, merged to `main`, and deployed to Vercel as a dummy/read-only preview. Option 3 visual direction is approved for the next implementation iteration.
- Repository: `yanskfz/ngekost-jogja`, public, default branch `main`.
- Workflow: Agent OS + Claude Code implementation after plan approval.
- Hosting direction: Vercel first; Supabase is the recommended production data/auth/storage layer.
- Task 1 result: Next.js 15 + TypeScript app, `lib/supabase/*` and `lib/map/*` adapters, `.env.example`, `vercel.json` (`framework: nextjs`), tests, `docs/FOUNDATION.md`. Old static demo moved to `prototype/`.
- Task 1 follow-up: `npm audit` reported 2 findings (high/moderate) from `postcss` 8.4.31 bundled by `next@15.5.28` (latest 15.x). Fixed with an `overrides` entry (`postcss ^8.5.31`) instead of the breaking `next@16` upgrade; `npm audit` now reports 0 vulnerabilities and typecheck, tests, and build pass. Remove the override when a Next 15 release ships a patched postcss. Verification was run by the implementing agent, not an independent QA run.
- Task 2 result: data contracts (`lib/data/types.ts`), rules for visibility/expiry/transitions (`lib/data/rules.ts`), dummy fixtures (`data/dummy-listings.ts`), read-only preview source (`lib/data/preview.ts`) rendered by `app/page.tsx`, and a dev/test-only SQLite adapter (`lib/data/dev-database.ts`, `node:sqlite`). No Supabase credentials needed; no write path in the preview. See `docs/DATA_MODEL.md`. Checks were run by the implementing agent, not independent QA.
- Review fix (P1): declared Node.js `>=22.13.0` (`engines`, `.nvmrc`, `.npmrc` `engine-strict`) because `node:sqlite` is unavailable unflagged on older Node; documented in README and docs. Re-run by the implementing agent: typecheck, tests, build, audit.
- Design handoff: `docs/DESIGN_OPTION_3_HANDOFF.md` (iteration 2 hard requirements, responsive visual acceptance, QA workflow) and the Option 3 reference are the source of truth. PR #2 implements Option 3, the blocking consent modal, the server-side 3-of-5 anonymous gate with demo unlock, and the sliced-asset pipeline (no generated images). Visual fixes after the QA review: listing cards no longer clip or split prices at 320–1440 px, and category/trust/warning/modal assets are visually separated from their parent surfaces. `design-qa.md` lists 133 PASS, 0 FAIL, 3 BLOCKED (cross-browser, screen reader, independent QA) with severities and 11 screenshots in `docs/qa-screenshots/`; the implementing-agent run was independently repeated in a clean worktree: build, typecheck, 28/28 unit tests, audit 0 vulnerabilities, and E2E exit 0 with 133 PASS/0 FAIL/3 BLOCKED, repeated twice. The remaining blocks are Firefox/WebKit and screen-reader environment limits; visual fidelity approval remains with the product owner. Lighthouse mobile 91 (consented). Demo sign-in is not real authentication. Not merged and not deployed by Claude Code; product-owner visual approval comes next.
- Trust and discovery iteration (branch `claude/trust-discovery-iteration`, based on the PR #2 head; not merged, not deployed): all nine Product Owner-approved UI additions are implemented on the dummy/read-only preview — trust evidence badges, last-confirmed and availability rows, approximate map with Open in Maps, role badge and broker-fee transparency, report flow, "Jadwalkan survei" template, expanded filters and sorting, three-photo guidance, and a concise consent modal (consent version `2026-10-v2`). Details, assumptions, and what is not built: `docs/TRUST_AND_DISCOVERY.md`; funnel events: `docs/METRICS.md`; results: `design-qa.md`. Verification was run by the implementing agent, not independent QA.
- Date: 2026-10-25.

## Open questions

- [x] Map provider — use OpenStreetMap-compatible maps for MVP.
- [x] Owner/broker verification — use declared role plus admin verification; do not claim guaranteed ownership.
- [x] Fraud report handling — report immediately hides the listing while admin investigates.
- [x] Expiry — hide automatically after 2 months; allow reconfirmation.
- [x] Admin auth — start with one admin account using email plus WhatsApp reachability verification.
- [x] WhatsApp verification scope — admin-supervised manual reachability check for MVP; automated OTP is deferred.
- [ ] Report response SLA — the design requires an admin response SLA before launch; no value was given, so the preview states none.
- [ ] Broker "relationship" disclosure — the design says brokers must disclose any fee or relationship; only the fee (none / disclosed amount / undisclosed) is modelled.
- [ ] Price bands and sort options — below Rp 1 jt / Rp 1–2 jt / above Rp 2 jt per month (yearly kontrakan converted to monthly) and the four sort options were chosen by the implementer; confirm or replace.
- [ ] Availability `unknown` on approved listings — allowed in the dummy data (labelled "Ketersediaan belum dikonfirmasi"); decide whether admin approval should require a known value.
- [ ] Homepage copy — hero and trust-card wording were changed away from "dari pemilik langsung" and "terverifikasi" (the design flags both); confirm the new wording.
- [ ] `LOCATION_JITTER_SECRET` — must be provisioned per environment before any real listing; the development fallback is public.
- [ ] Analytics sink — preview events go to stdout only; choose a production sink, retention, and analytics consent.
- [ ] Hosted production database/provider — must be selected and configured before public launch.
- [ ] Map tile provider — the default public OSM tile server is development-only; choose a policy-compliant provider before production.

## Next step

1. Independent review and QA of the trust and discovery branch (the 253 automated checks are the implementer's; cross-browser and screen-reader checks are BLOCKED here), then Product Owner visual approval of the new screens.
2. Resolve the open questions above, then decide how this branch relates to PR #2 (merge order). Do not merge or deploy before visual approval and QA pass.
3. Task 3 (auth and submitter workspace) still needs a hosted auth provider decision. Hosted database setup stays a public-launch prerequisite (`docs/PUBLIC_LAUNCH_DATABASE.md`).

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
- 2026-10-25 — Vercel preview uses non-sensitive dummy listings and read-only behavior until a hosted production database is configured.
- 2026-10-25 — SQLite is for local development/tests only; a persistent hosted database is required before public submissions or public moderation.
- 2026-10-25 — Iteration 2 requires a blocking anti-scam consent modal before browsing, anonymous users see exactly 3 of 5 public listings until signup/login, and Claude Code may only slice/polish committed image references; it may not generate new images.

- 2026-10-25 — Public listing output never carries exact coordinates or the exact address; the map shows a point 300–500 m from the real location, derived with a server-side secret, plus a neighborhood label. User geolocation is optional, one-shot, in-memory, and never required for browsing.
- 2026-10-25 — Trust badges may only state checks backed by a stored record, are never worded as a safety guarantee, and show missing checks as "belum" on the detail page.
- 2026-10-25 — Roles are labelled "Pemilik" and "Agen"; broker fees are stated as declared and never collected by Ngekost Jogja.
- 2026-10-25 — The anonymous 3-of-5 limit is a fixed launch rule. Consent completion, abandonment, and sign-up conversion are measured; safety consent is not A/B tested yet.
- 2026-10-25 — List cards show the address on one line (kecamatan and region, ellipsis when too long); the full neighborhood label stays on the detail page. Requested by the Product Owner during the first visual review.
- 2026-10-25 — The consent modal wording changed, so the consent version is `2026-10-v2` and earlier consent no longer counts.

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
- Vercel preview may use non-sensitive dummy fixtures and must not imply that public submissions persist.
- Public launch requires a hosted persistent database, auth, storage, migrations, backups, RLS/access rules, admin account, and secret environment variables.
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

## QA requirements for the current design iteration

- Requirements preflight must happen before E2E: read this brief and `docs/DESIGN_OPTION_3_HANDOFF.md`, state assumptions, and freeze acceptance criteria.
- QA must apply Karpathy guidelines and Ponytail review principles; the implementer report alone is not independent QA evidence.
- E2E must cover happy path, edge cases, and negative/security cases, including consent bypass attempts, the 3-of-5 listing gate, direct URLs, query/client-state bypasses, locked-data leakage, non-public listings, search/filter empty states, long content, missing optional data, JS-disabled behavior, and required responsive viewports.
- Visual QA must capture the modal, consented homepage, category/trust assets, listing section, detail, locked gate, and demo-unlocked state. DOM overflow checks alone do not establish visual pass.
- Asset acceptance: no unintended color collision, overlap, clipping, or unclear boundary between a sliced asset and its parent surface. Listing cards must not clip price, metadata, CTA, or image at mobile width.
- Every scenario is recorded as PASS, FAIL, or BLOCKED with evidence and severity/priority. P0 means security/data exposure or app unavailable; P1 means core journey broken or content clipped; P2 means meaningful visual/accessibility/coverage issue; P3 is polish.



### Living regression requirement

Testcases must improve continuously during implementation and QA:

- Every discovered bug becomes a deterministic regression test before the fix is accepted.
- The test must fail before the fix and pass after it.
- Keep prior coverage; do not delete a test unless the requirement is removed or replaced and the reason is documented.
- Update `design-qa.md` with the reproduction, testcase, result, severity/priority, and residual risk.
- Re-run targeted regression tests after each fix, followed by the full E2E suite.

## Done when

- [x] Product scope, non-goals, trust policy, and moderation checklist are approved.
- [x] Data contract and permission/status states are approved.
- [x] Agent OS plan has task-level acceptance criteria.
- [ ] Claude Code implements only approved tasks.
- [ ] Independent review passes.
- [ ] QA records executed results.
- [ ] Vercel deployment is verified read-only.
- [ ] Public database setup checklist is complete before enabling submissions or moderation.
