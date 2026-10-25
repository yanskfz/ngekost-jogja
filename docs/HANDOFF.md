# Claude Code Handoff — Task 1 Foundation

Scope:
- Implement only Task 1 from IMPLEMENTATION_PLAN.md: foundation and provider setup.
- Prepare the Vercel-ready application structure and provider boundaries.
- Do not implement public listing UX, auth flows, database migrations, admin moderation, CSV import, or deployment.

Owner:
- Claude Code developer agent.

Inputs:
- BRIEF.md
- IMPLEMENTATION_PLAN.md
- CLAUDE.md
- Agent OS plugin from yanskfz/agent-os
- Existing prototype files are reference material only; preserve or replace them deliberately and document the choice.

Acceptance criteria:
- The application uses a maintainable Next.js + TypeScript structure suitable for Vercel.
- Supabase client/server boundaries are isolated behind small modules.
- OpenStreetMap-compatible map integration has an adapter boundary without committing provider secrets.
- Environment variables are documented in .env.example and no secrets are committed.
- The app has documented local start and production build commands.
- Existing Vercel configuration remains valid or is updated with evidence.
- A production build completes successfully.
- No new product scope is implemented in this task.
- Add or update focused tests only for the foundation behavior.

Checks already run:
- Requirements are locked in BRIEF.md.
- Architecture and risks are documented in Ngekost Jogja System Design.docx.
- Agent OS settings are enabled in .claude/settings.json.
- Current demo prototype has not been migrated to production storage.

Output expected:
- A focused implementation commit or pull request for Task 1.
- Updated BRIEF.md Status and Next step.
- A short verification report listing commands actually run and their pass/fail results.
- Any provider or access blocker recorded as an Open question; do not guess.

Unresolved:
- Supabase project URL and keys are not yet available.
- Final map provider policy/credentials are not configured.
- Do not deploy production or request payment-related access.
