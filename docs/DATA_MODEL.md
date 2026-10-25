# Data Model (Task 2 — development and preview)

Contracts live in `lib/data/types.ts` and mirror the Data section of `BRIEF.md`: accounts, listings, listing images,
consents, moderation events, reports, and import batches.

## Where data comes from

| Environment | Source | Writes |
| --- | --- | --- |
| Vercel preview | In-memory dummy fixtures (`data/dummy-listings.ts` via `lib/data/preview.ts`) | None. No write path exists. |
| Local development and tests | SQLite via `lib/data/dev-database.ts` (Node's built-in `node:sqlite`, in memory by default) | Local only |
| Public launch | Hosted database (see `PUBLIC_LAUNCH_DATABASE.md`) | Not implemented yet |

SQLite is a development/test tool only and is never imported by app routes. The preview page states that its data is
dummy and not persistent. All fixture emails use `@example.test` and all phone numbers and addresses are invented.

## Rules (`lib/data/rules.ts`)

- Public visibility: `status = approved` and `expires_at` in the future. Nothing else is public.
- Expiry: two calendar months (UTC, month ends clamped) after approval or reconfirmation.
- Moderation transitions: approve/reject from `pending`; hide from `pending|approved|reported`; restore from
  `hidden|reported`; expire from `approved`; reconfirm from `approved|expired`. Other combinations are refused.
- Hide and reject require a reason. Approval requires exactly 3 images.
- Submitters can read and edit only their own `draft`/`pending` listings; other accounts' listings look nonexistent.
- Every status change by `DevDatabase.moderate` writes a `moderation_events` row with a timestamp in one transaction.
- Public output (`PublicListing`) omits `owner_id`, `source`, permission and verification fields.

## Not in this task

Reports hiding listings, consent capture flows, CSV import, auth, and image storage are later tasks. The tables exist
so the contract is complete, but no adapter method mutates them yet except moderation events.

## Dev-adapter limitations

The SQLite adapter checks access in application code; it does not model database-level row security. The hosted
database must enforce the same rules with row-level policies (see `PUBLIC_LAUNCH_DATABASE.md`). Node's `node:sqlite`
is experimental, prints a warning when first loaded, and requires Node.js >= 22.13.0 (declared in `package.json` `engines`).
