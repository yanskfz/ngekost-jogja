# Ngekost Jogja — Claude Code Workflow

This project follows the Agent OS workflow from `yanskfz/agent-os`.

## Ownership

- Codex / project owner: requirements, decisions, routing, and final scope.
- Claude Code: implementation only after `BRIEF.md` has clear acceptance criteria.
- Reviewer: independent diff review.
- QA: executed verification without fixing.
- Deployment assistant: read-only deployment verification.

## Before changing code

1. Read `BRIEF.md`.
2. Confirm the task is listed in scope and has checkable acceptance criteria.
3. If a requirement is missing or ambiguous, add an Open question to `BRIEF.md` and stop.
4. Do not expand the product scope or invent business rules.

## Required workflow

Use the smallest suitable Agent OS owner:

- `project-brief` for requirements and decisions.
- `project-planner` for the implementation plan.
- `developer` for one scoped implementation task.
- `code-reviewer` for independent review.
- `qa-agent` for executed acceptance checks.
- `deployment-assistant` for read-only preview/deployment checks.

Keep implementation and git content in English. User-facing discussion may be Indonesian.


## Karpathy guidelines (mandatory)

The project also uses the `andrej-karpathy-skills` plugin from `multica-ai/andrej-karpathy-skills`.

Before every implementation, review, or refactor:

1. Read and apply the `karpathy-guidelines` skill.
2. State assumptions and surface ambiguity before changing code.
3. Prefer the smallest solution that meets the acceptance criteria.
4. Make surgical changes only; do not refactor unrelated code.
5. Define verifiable checks and loop until they pass.

If the plugin is unavailable in the current Claude Code session, read the source guidance from the repository before continuing. This is a workflow requirement, not optional style guidance.
