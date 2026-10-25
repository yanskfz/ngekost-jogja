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
