# Ngekost Jogja — Agent OS Implementation Plan

## Status (2026-10-25)

Task text and acceptance criteria below are unchanged. This table records what exists on `main` and on the branch `claude/trust-discovery-iteration` (verified by the implementing agent; QA independence is noted separately). Everything runs on the dummy/read-only Vercel preview; nothing is persistent.

| Task | Status | What exists / what is missing |
| --- | --- | --- |
| 1 Foundation and provider setup | Done | Merged (PR #1). Independent static review and QA passed. |
| 2 Development data model and public database notes | Done | Merged (PR #1). Dummy fixtures, dev SQLite adapter, `docs/DATA_MODEL.md`, `docs/PUBLIC_LAUNCH_DATABASE.md`. |
| 3 Authentication and submitter workspace | Not started | Only a demo sign-in cookie exists (not authentication). Waits for the hosted auth/database decision. |
| 4 Public discovery experience | Partial (preview) | Done: mobile-first search, filters (type, area, price, facilities, availability), sorting, detail page, WhatsApp and survey CTA, anti-transfer warning, 3-of-5 anonymous gate; only approved, non-expired listings are public. Missing: map/list switching (the map is an approximate-area preview on the detail page only). |
| 5 Image, location, and listing validation | Partial | Done: three-photo rules and guidance (`lib/validation/photos.ts`, structural checks only), approximate public location. Missing: the submission form, uploads and storage, consent capture, per-field validation of a submission. |
| 6 Admin moderation and trust workflow | Not started | Moderation rules and audit events exist only in the dev SQLite adapter (no UI, no auth). Reports hide a listing only in the reporter's browser. |
| 7 CSV bulk import | Not started | |
| 8 Safety, privacy, and abuse controls | Partial | Done: warning at discovery, detail, and the contact action; report flow (preview model) with the five reasons; consent version; minimized public contact data. Missing: correction/removal request path, rate limiting (only a honeypot and length limits), durable reports. |
| 9 Quality gates | Partial | 118 unit tests and 284 E2E checks; responsive checks at 320–1920 px; axe WCAG A/AA. Results live in `design-qa.md` (not `docs/TEST-RESULTS.md`). Cross-browser and screen-reader checks are blocked in the sandbox. |
| 10 Review and deployment handoff | Not started | Independent QA of PR #2 and static review of Tasks 1–2 happened; there is no independent code review of the later work and no documented deployment verification by a separate role yet. |

Work outside the original task list: the Option 3 design implementation, the consent modal, and the trust and discovery additions (`docs/TRUST_AND_DISCOVERY.md`) were requested by the Product Owner through design handoffs rather than this plan; they overlap Tasks 4, 5, and 8 as shown above.

## Scope

### In scope

- Replace demo-only browser storage with a maintainable Vercel-ready application foundation.
- Use non-sensitive dummy fixtures for the Vercel preview; preview submissions are read-only and not presented as persistent.
- Implement public listing discovery: text search, structured filters, map view, detail pages, and WhatsApp contact.
- Implement submitter onboarding and own-listing create/edit flow for owner and broker roles.
- Implement admin moderation, reports, expiry/reconfirmation, consent audit, and CSV import.
- Implement the anti-scam UX and privacy safeguards defined in BRIEF.md.
- Add automated checks, independent review, and read-only deployment verification.

### Out of scope

- Payments, deposits, booking, escrow, subscriptions, commissions, or in-platform messaging.
- Guaranteed identity/ownership verification or transaction safety guarantees.
- Scraping Facebook or copying third-party listings without permission.
- Ratings/reviews, recommendations, complex analytics, or native mobile apps.
- Automated WhatsApp OTP in the first MVP; MVP uses admin-supervised reachability verification.

## Tasks

1. **Foundation and provider setup**
   - Files: package.json, app/**, lib/**, supabase/**, .env.example, vercel.json.
   - Choose and document Next.js + TypeScript structure, Supabase client boundaries, environment variables, and OpenStreetMap-compatible map adapter.
   - Keep secrets out of git and preserve the local demo as a migration reference only.

2. **Development data model and public database notes**
   - Files: data/dummy-listings.*, db/** or drizzle/**, docs/DATA_MODEL.md, docs/PUBLIC_LAUNCH_DATABASE.md.
   - Define the listing/consent/moderation/report contracts and a local SQLite schema or adapter for development/tests.
   - Seed only non-sensitive dummy fixtures for the Vercel preview; do not accept persistent public submissions yet.
   - Document the required hosted database, auth, storage, migrations, backups, RLS/access rules, admin account, and secret environment setup before public launch.

3. **Authentication and submitter workspace**
   - Files: app/auth/**, app/dashboard/**, components/submitter/**, lib/auth/**.
   - Add email verification/login and WhatsApp reachability status managed by admin.
   - Allow a submitter to create/edit only their own draft or pending listings.
   - Capture publish/contact consent and role declaration.

4. **Public discovery experience**
   - Files: app/(public)/**, components/listings/**, lib/search/**, components/map/**.
   - Implement mobile-first search, text query, filters, map/list view, listing detail, and WhatsApp CTA.
   - Show only approved, non-expired listings.
   - Show source/provenance only when allowed and display the anti-transfer warning.

5. **Image, location, and listing validation**
   - Files: components/listing-form/**, lib/validation/**, supabase/storage/ if needed.
   - Require exactly 3 images before approval, map location, reachable WhatsApp, contact name, detailed condition, and required consent.
   - Validate area as Sleman or Kota Jogja and keep uploaded images private until approval if feasible.

6. **Admin moderation and trust workflow**
   - Files: app/admin/**, components/admin/**, lib/moderation/**.
   - Build pending queue, detail review, approve/reject, hide/restore, report investigation, role/verification review, and audit history.
   - A report must hide a listing immediately and create an auditable event.
   - Add reconfirmation and automatic expiry after two months.

7. **CSV bulk import**
   - Files: app/admin/import/**, lib/import/**, docs/CSV_FORMAT.md.
   - Accept the agreed CSV columns, preview validation errors, detect duplicates, record source/permission fields, and import everything as pending.
   - Never publish an imported listing automatically.

8. **Safety, privacy, and abuse controls**
   - Files: components/trust/**, app/report/**, app/privacy/**, lib/audit/**.
   - Add no-transfer messaging at discovery, detail, and contact points.
   - Add report reasons, correction/removal request path, consent versioning, and minimized public contact data.
   - Add rate limiting or a documented MVP fallback for submission/report abuse.

9. **Quality gates**
   - Files: tests/**, playwright.config.*, docs/TEST-RESULTS.md.
   - Add unit/integration coverage for status transitions, expiry, consent, import validation, access control, and report hiding.
   - Run responsive checks at 320, 390, 768, 1024, 1440, and 1920 px.
   - Keep QA read-only after implementation is complete.

10. **Review and deployment handoff**
    - Files: docs/HANDOFF.md, docs/DEPLOYMENT.md.
    - Run independent code review, resolve findings, and run QA.
    - Verify Vercel preview read-only, required environment variables, database migrations, and public listing filters.
    - Record evidence and remaining blockers; do not deploy production without explicit authorization.

## Dependencies

- Task 1 must complete before Tasks 2–8.
- Task 2 must complete before Tasks 3–8.
- Task 3 must complete before submitter flows in Tasks 5 and 6.
- Task 4 depends on Tasks 2 and 5.
- Task 5 depends on Tasks 2 and 3.
- Task 6 depends on Tasks 2, 3, and 5.
- Task 7 depends on Tasks 2 and 6.
- Task 8 depends on Tasks 3, 4, and 6.
- Task 9 depends on Tasks 3–8.
- Task 10 depends on Task 9 and an available Vercel preview.

Outside blockers:

- Hosted production database/provider, credentials, and migration process before public launch.
- Map provider/API policy decision.
- Admin account identity.
- Vercel project connection.
- Initial permissioned listing data.

## Acceptance criteria

### Task 1

- App starts with documented commands.
- A production build completes without secrets in the repository.
- Vercel configuration points to the application correctly.
- Provider adapters are isolated behind small modules.

### Task 2

- The development schema/adapter represents every entity in the Data section of BRIEF.md.
- Vercel preview reads only non-sensitive dummy fixtures and clearly communicates that submissions are not persistent.
- docs/PUBLIC_LAUNCH_DATABASE.md lists the concrete setup required before public submissions are enabled.
- Submitters cannot read or mutate another submitter's private records.
- Public queries can return only approved, non-expired listings.
- Every moderation and consent mutation has an auditable timestamp.

### Task 3

- A user can verify email, declare owner/broker role, submit WhatsApp for admin reachability review, and see verification state.
- A submitter can create and edit only their own draft/pending listings.
- Consent is required and versioned before submission.

### Task 4

- At 390 px wide, there is no horizontal page scroll.
- Search, area/type/price/facility filters, and map/list switching work together.
- Detail page shows exactly the approved public fields and a WhatsApp CTA.
- Draft, rejected, hidden, and expired listings never appear publicly.

### Task 5

- Submission cannot pass client or server validation without 3 photos, location, contact name, WhatsApp, condition details, role, source/permission state, and both consents.
- Images are stored with ownership checks and safe file constraints.
- Only Sleman and Kota Jogja are accepted in MVP.

### Task 6

- Admin can review all pending listings and see consent, source, role, verification, and audit history.
- Approve/reject/hide/restore actions require a reason where appropriate.
- A report immediately removes the listing from public results.
- A listing becomes hidden/expired at two months unless reconfirmed.

### Task 7

- CSV preview identifies missing required columns, invalid prices/statuses, duplicates, and missing permission state.
- Valid imports are pending and auditable.
- No CSV import can publish a listing automatically.

### Task 8

- Anti-transfer warning appears before or at the WhatsApp contact action.
- Report flow supports suspected scam, wrong location, unavailable listing, misleading price, and abuse.
- Public pages do not expose unnecessary private account data.
- Correction/removal requests are recorded for admin follow-up.

### Task 9

- Automated checks cover authorization, moderation transitions, expiry, consent, and import validation.
- Responsive QA produces one pass/fail result for each target viewport.
- QA reports evidence only and does not modify implementation code.

### Task 10

- Review findings are recorded and resolved or explicitly accepted.
- Vercel preview is reachable and environment configuration is documented.
- Deployment verification confirms only approved/non-expired listings are public.
- Production deployment remains user-authorized and separate.

## Risks

- **High — scam reports create user harm.** Mitigation: no-payment policy, prominent warnings, immediate hide/report path, audit trail, and no safety guarantee claims.
- **High — provider/auth costs or WhatsApp verification complexity.** Mitigation: keep WhatsApp verification manual for MVP and isolate providers behind adapters.
- **Medium — map provider quota or policy changes.** Mitigation: OpenStreetMap-compatible adapter and documented fallback.
- **Medium — privacy leakage through WhatsApp/source URLs.** Mitigation: explicit contact consent, minimized public fields, and correction/removal workflow.
- **Medium — stale inventory.** Mitigation: two-month expiry, reconfirmation workflow, and last-confirmed timestamps.
- **Medium — CSV quality issues.** Mitigation: preview, strict validation, duplicate checks, pending-only import.
- **Low — responsive regressions.** Mitigation: fixed viewport QA matrix and review gate.

## Definition of done

- BRIEF.md and this plan match the shipped scope.
- Agent OS configuration remains enabled.
- Tasks 1–8 are implemented with tests and no known critical trust/privacy defect.
- Code review passes independently.
- QA records executed results for functional and responsive criteria.
- Vercel preview verification passes read-only.
- Remaining limitations and production blockers are documented.
- Claude Code does not implement beyond this plan without a new decision in BRIEF.md.

Current state against this list: BRIEF.md and this plan now describe the shipped scope; Agent OS configuration is enabled; Tasks 1–8 are **not** all implemented (see Status); independent code review, a separately run deployment verification, and the public-launch items are still open. The Product Owner's design handoffs are the recorded decisions for the work done outside this plan.
