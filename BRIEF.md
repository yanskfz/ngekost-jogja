# Ngekost Jogja — Project Brief

## Status

- Stage: requirements clarification before implementation.
- Repository: `yanskfz/ngekost-jogja`, public, default branch `main`.
- Workflow: Agent OS + Claude Code implementation after requirements are clear.
- Hosting direction: Vercel first; production data storage is not selected yet.
- Date: 2026-10-25.

## Open questions

- [ ] Which launch areas are mandatory for the first 100 approved listings: all Jogja, Sleman first, or a named area list?
- [ ] Who may publish: property owners only, verified agents, or both with different badges?
- [ ] What is the minimum listing data required before submission and before public approval?
- [ ] Are listing photos required for approval, and where may owners upload them?
- [ ] What owner identity/auth is required for MVP: WhatsApp verification, email magic link, or admin-assisted posting?
- [ ] What does an admin need to verify before approval: consent only, phone reachability, location, price, or all of these?
- [ ] How should listing freshness work: manual reconfirmation, expiry after a fixed period, or both?
- [ ] What is the intended admin access model and who is allowed to approve/reject listings?
- [ ] Should search be local text/filter only for MVP, or include map/geolocation?
- [ ] What is the first launch success threshold beyond 100–500 approved listings?

## Next step

Answer the open questions in this brief. Then Codex will convert the decisions into a scoped Agent OS plan with task-level acceptance criteria for Claude Code.

## Decisions

- 2026-10-25 — Start with a free marketplace for kost and kontrakan in Jogja.
- 2026-10-25 — Initial launch target is 100–500 permissioned listings.
- 2026-10-25 — Do not build subscriptions, payments, booking, or escrow in the first scope.
- 2026-10-25 — Use Vercel as the first hosting target.
- 2026-10-25 — Listing information from third-party communities may be used for lead discovery, but publication requires owner permission.
- 2026-10-25 — Requirements and acceptance criteria must be clear before Claude Code implementation starts.

## Requirements

### Product

- Public, mobile-first marketplace for kost and kontrakan listings in Jogja.
- Users can search and filter listings by area, type, price, and selected facilities.
- Users can open a listing detail page and contact the owner through WhatsApp when contact consent exists.
- Owners can submit and edit their own listing.
- Admins can review, approve, reject, archive, and bulk-import listings.
- Imported listings must enter a review state and must not become public automatically.
- Public listing data must show only fields the owner has allowed to be published.

### Trust and privacy

- Record publish consent and contact consent with timestamp and consent text version.
- Store source, permission status, verification status, and last-confirmed timestamp.
- Provide a way to request correction or removal.
- Do not scrape or republish third-party listings without permission.
- Minimize personal data shown publicly.

### Delivery

- Vercel-compatible deployment.
- Claude Code is the implementation owner after the plan is approved.
- Each implementation task must have explicit acceptance criteria and a narrow file scope.
- Review, QA, and deployment verification are separate quality gates.

## Data

### Listing

- id
- title
- type: kost | kontrakan
- area
- address
- price_monthly
- deposit
- facilities
- description
- images
- contact_whatsapp
- status: draft | pending | approved | rejected | archived
- owner_id
- source
- permission_status
- verification_status
- last_confirmed_at
- created_at
- updated_at

### Consent

- listing_id
- owner_id
- publish_allowed
- contact_allowed
- consent_text_version
- captured_at
- ip_hash or equivalent privacy-preserving audit identifier

## Done when

- [ ] Open questions are answered or explicitly deferred.
- [ ] Scope and non-goals are approved.
- [ ] Data contract and permission states are approved.
- [ ] Agent OS plan has task-level acceptance criteria.
- [ ] Claude Code implements only approved tasks.
- [ ] Independent review passes.
- [ ] QA records executed results.
- [ ] Vercel deployment is verified read-only.
