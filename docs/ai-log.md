# AI Usage Log

Running log of how AI was used, the main prompts, and where it got things wrong. Summarized into the README at the end.

## Setup

- Tooling: Claude Code (Opus) as orchestrator; two project subagents (`backend-engineer`, `frontend-engineer`) defined in `.claude/agents/`.
- Workflow: orchestrator drafts conventions, API contract and plans → human reviews → agents build in parallel against the contract → orchestrator and human review every module.

## Session 1 — Analysis and planning

### Prompt 1 — kickoff

> Analyze this task for me and let's plan it together. We will make it dockerized. Front end with ReactJS, TypeScript; database PostgreSQL; backend Python/DRF. We need a real MVP with minimal work. My assumption: 3 agents — a minimal-model agent distributing work between a Front End engineer agent and a Backend engineer agent; sub agents talking together to finalize. Structure: fudoo/{fudoo-be, fudoo-fe, Agent.md, Plan.md, .claude}, with a Plan.md for each app.

**AI analysis:**

- The brief grades correctness (stock always right, order states can't break), understanding of every line, tests on what matters, and judgment on ambiguities. Volume is not graded.
- Proposed design: append-only stock ledger, a service layer with `transaction.atomic` + `select_for_update`, a declarative PO state machine, idempotent POS sales via `external_id`, Decimal quantities, UI polling every 5 s with a freshness indicator.
- Pushed back on the agent setup:
  - A small-model dispatcher is the weakest link where the most judgment is needed (contract, sequencing, review). The main session orchestrates instead.
  - Subagents cannot talk to each other. Coordination goes through a shared API contract file and the orchestrator.
  - `Agent.md` is not read by Claude Code, so it became `AGENTS.md` plus a `CLAUDE.md` that imports it.
- Raised the risk that parallel agents produce more code than can be explained in the interview. Mitigation: small module-sized tasks, one commit each, reviewed before the next.

### Prompt 2 — decisions and code rules

> 1. No negative stock — if stock is not available it can't be used. 2. Add a cancel move. 3. Tailwind CSS. 4. Create the repository. 5. Draft PLAN.md, I'll follow up. 6. Modular monolith; commit and push per module, no PRs. 7. Everything on main. Engineers: no function over 15 lines, no explanatory comments, best practices, design patterns, SOLID, KISS, YAGNI, DRY.

**AI proposal → human decision:**

- Proposed allowing negative stock on sales, because the sale physically happened. **Overruled**: a sale whose recipe can't be covered is rejected (409 `insufficient_stock`, nothing deducted). Enforced in the service and by a DB check constraint.
- Added `cancelled` (from draft/sent). Added short-close (`received → closed`) so a PO isn't stuck open forever when a supplier never delivers the rest.
- Proposed plain CSS. Human chose Tailwind.
- Applied the 15-line rule to React components as well.
- Git: single `main`, path-scoped staging per agent (`git add fudoo-be/` only), because both agents share one working tree and `git add -A` would sweep up the other agent's files.

**Output:** `AGENTS.md`, `docs/api-contract.md`, agent definitions, docker-compose, Makefile; private repo `ehamamrah/fudoo`.

### Prompt 3 — plans

> Add the PLAN.md and a brief of my prompts and your analysis/plan, then ask me again to proceed. PLAN.md for the project and a plan for each of fudoo-be and fudoo-fe.

**AI decisions:**

- Root `PLAN.md` kept to one page (a brief requirement) and limited to the product plan. Prompt history lives here instead.
- `fudoo-be/PLAN.md` and `fudoo-fe/PLAN.md` are implementation plans: modules, build order (one commit per step), key tests.
- The PLAN.md draft takes clear positions: a pilot date of 10 Dec 2026 that depends on POS sandbox access; "trust in the stock number" as the product thesis; count variance as the main signal.

### Prompt 4 — plan corrections

> Make the engineer split 2 not 3. What did the document say about branches? I believe it's one branch for now.

**AI response:**

- Pointed out that the brief fixes the squad at three engineers. Human clarified: 3 engineers in 2 workstreams (Backend: 2, Frontend: 1). The two backend engineers review each other's stock code.
- Branches: the brief's build is one branch, but the plan is for "many restaurants". The draft had wrongly made branches the tenant. Corrected: restaurants are tenants with one branch each; multi-branch and stock transfers moved to the cut list.

### Prompt 5 — restaurants and branches

> Don't you think we can consider multiple restaurants, and a restaurant can have multiple branches? A future-proofing approach?

**AI response:** Agreed for the data model, not for features. Stock physically lives at a branch, and adding a branch scope after launch would mean migrating every stock table. So the plan scopes stock, POs and sales to a branch from day one, and catalog and suppliers to the restaurant. Multi-branch features (switcher, transfers, cross-branch reports) stay cut. The build stays single-branch per the brief; tenancy goes under README "next steps".
