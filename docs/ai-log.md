# AI Usage Log

Running log of how AI was used, the main prompts, and where it got things wrong. Summarized into the README at the end.

## Setup

- Tooling: Claude Code (Opus) as orchestrator; two project subagents (`backend-engineer`, `frontend-engineer`) defined in `.claude/agents/`.
- Workflow: orchestrator drafts the API contract and conventions → human reviews the contract → agents build in parallel against it → orchestrator + human review every diff.

## Session 1 — Analysis and planning

Prompt (summary): "Analyze the brief, plan it together. Dockerized, React/TS, PostgreSQL, Python/DRF. Minimal MVP. Three agents: a small-model dispatcher plus FE and BE engineer agents."

AI proposal → human decision:
- Proposed dropping the small-model dispatcher: orchestration needs the most judgment (contract, review). Accepted.
- Noted subagents cannot talk to each other; coordination goes through `docs/api-contract.md` and the orchestrator. Accepted.
- Proposed allowing negative stock on sales (the sale physically happened). **Overruled by human**: no negative stock — a sale whose recipe can't be covered is rejected. Implemented as service check plus DB check constraint.
- Added a `cancelled` state on human request; short-close (`received → closed`) for suppliers who never deliver the rest.
- Proposed plain CSS. Human chose Tailwind.
