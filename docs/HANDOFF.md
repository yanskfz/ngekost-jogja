# Claude Code Handoff — Task 2 Development Data

Scope:
- Implement only Task 2 from IMPLEMENTATION_PLAN.md.
- Use non-sensitive dummy listing fixtures for the Vercel preview.
- Add a local SQLite-compatible development schema/adapter or equivalent local test database.
- Keep preview flows read-only; do not imply that public submissions, reports, or moderation changes persist.
- Add docs/PUBLIC_LAUNCH_DATABASE.md and keep it aligned with the public-launch prerequisites.

Owner:
- Claude Code developer agent.

Inputs:
- BRIEF.md
- IMPLEMENTATION_PLAN.md
- CLAUDE.md
- docs/PUBLIC_LAUNCH_DATABASE.md
- Agent OS plugin from yanskfz/agent-os

Acceptance criteria:
- Dummy listings cover approved, pending, hidden, expired, and broker/owner examples without real personal data.
- Public preview reads only approved and non-expired dummy listings.
- The development data model represents listings, accounts, images, consents, moderation events, reports, and import batches.
- Local tests cover status filtering, two-month expiry behavior, and submitter/admin ownership boundaries where feasible.
- No Supabase credentials are required for the preview or local tests.
- No persistent public write path is enabled.
- Production database setup requirements are documented, including migrations, auth, storage, RLS/access rules, backups, Vercel env vars, and go-live checks.
- Typecheck, tests, and production build pass.
- Do not start public auth, admin moderation UI, CSV import UI, or production deployment in this task.

Checks already run:
- Task 1 PR #1 exists and has implementing-agent checks: audit 0, typecheck pass, tests pass, build pass.
- Task 1 independent static review found no blocking issue; CI and Vercel preview are not configured/verified.

Output expected:
- A focused commit or PR update for Task 2 development data and dummy preview.
- Updated BRIEF.md Status and Next step.
- A short verification report listing commands actually run and results.
- Any production provider uncertainty recorded as an Open question.

Unresolved:
- Hosted production database/provider is intentionally deferred until the preview data flow is validated.
- Map tile provider policy/credentials remain a production prerequisite.
