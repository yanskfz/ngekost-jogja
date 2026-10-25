# Public Launch Database Checklist

The Vercel preview may use non-sensitive dummy listings and read-only flows. It must not imply that owner submissions, admin actions, reports, or moderation changes persist until the hosted backend is configured.

Before enabling public submissions or public moderation, complete all of the following:

## Hosted data layer

- Choose a persistent provider: Supabase/Postgres, Turso/libSQL, or another reviewed production database.
- Create separate development and production projects/databases.
- Apply versioned migrations for accounts, listings, listing images, consents, moderation events, reports, and import batches.
- Add constraints for listing status, role, area, consent, exactly three required approval photos, and two-month expiry.
- Add row-level access rules so submitters can manage only their own records and admins can moderate all records.
- Configure backups, retention, restore testing, and a deletion/correction process.

## Authentication and storage

- Configure email authentication and the admin account.
- Define how WhatsApp reachability is recorded and reviewed; do not treat a self-declared number as guaranteed identity.
- Configure private image storage, file type/size limits, ownership checks, and approved-image delivery.
- Add rate limits and abuse controls for submissions, reports, and contact actions.

## Vercel configuration

- Add production environment variables through Vercel project settings, never GitHub:
  - public database URL and browser-safe key
  - server-only service/admin key where required
  - storage and map provider configuration
- Verify preview, staging, and production environments do not share unintended data.
- Run migrations against the intended database before enabling write paths.
- Confirm public queries return only approved, non-expired, non-hidden listings.

## Go-live gate

- Run a supervised dry run with permissioned dummy and real listings.
- Verify approval, report-hide, restore, expiry, reconfirmation, correction, and removal flows.
- Confirm no transfer/payment messaging or UI implies that Ngekost guarantees a transaction.
- Complete independent review, QA, and read-only deployment verification.
- Only then enable owner/broker submissions and admin moderation in production.

## Safety consent and anonymous access (replace preview behavior)

The preview stores safety consent in an HttpOnly cookie and "signs in" with a demo cookie. Before public launch:

- Record safety consent with timestamp, consent text version, and account or session identifier on the server.
- Replace the demo cookie with real authentication; enforce the anonymous limit (3 complete listings, remaining listings locked) in the query layer or row-level policy, never only in the UI.
- Keep the contact-point warning at the WhatsApp action even after consent.

## Trust and discovery additions (go-live gate)

- Provision `LOCATION_JITTER_SECRET` (server-only, per environment, never committed). The development fallback must not be used with real listings.
- Store exact address and coordinates only in private columns/tables; expose only the approximate point and neighborhood label through the public read model, and cover that with a test against the hosted schema.
- Make reports durable and hide the reported listing for everyone immediately; define the admin response SLA, deduplicate reports per reporter, listing, and reason window, and keep an audit event.
- Make `reconfirm` idempotent so a retry cannot extend expiry twice.
- Add near-duplicate photo detection or mandatory admin review of the three photos before approval.
- Replace the stdout event log with a reviewed analytics sink, define retention, and keep events free of personal data.
- Confirm which fields may appear in the public evidence row; every badge must map to a stored record.
