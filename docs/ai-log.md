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

## Session 2 — Parallel build

### Prompt 6 — go

> Go ahead.

Two agents built `fudoo-be` and `fudoo-fe` in parallel against `docs/api-contract.md`, one commit per module.

**Where the setup itself failed:**

- Project subagents in `.claude/agents/` load only at session start, so calling them by name in the same session failed. Workaround: general-purpose agents told to adopt the definition files as their role.
- Both agents shared one working tree. The frontend agent's staged files were emptied by the backend agent's git activity, `git pull --rebase` refused to run because of the other agent's uncommitted files, and the agents overwrote each other's helper script in the shared scratch folder. Lesson: give each agent its own git worktree.

**Where the agents' first attempts were wrong (self-reported and fixed by them):**

- Backend: a test fixture set PO status by writing the field directly, bypassing the state machine. It was rewritten to drive orders through the real services.
- Backend: the concurrency test was checked by removing `select_for_update`. The race test then failed, which proves it tests something real.
- Frontend: four form components broke the 15-line rule. A shared `FormPanel` and small hooks were extracted.
- Frontend: the fetch mock treated any object with a `status` key as an HTTP response, which collided with `PurchaseOrder.status` and failed 12 tests.

**Caught in orchestrator review (not by the agents):**

- The frontend decided whether a PO could take a delivery from a hardcoded `["sent", "received"]` list, duplicating the state machine. The backend already had `can_receive`; it is now part of the API, and the UI uses it.
- The frontend invented a "low stock" rule from recipe quantities, a business rule in the UI that the brief didn't ask for. Removed, along with a BigInt decimal library that existed only to support it (YAGNI).

## Session 3 — Independent review

A fresh `code-reviewer` agent, with no build context, was asked to look for correctness problems in stock and PO state, contract drift, test gaps on critical paths, and rule violations. It found no blocking defects in the stock or state core. Triage:

| Finding | Decision |
|---|---|
| Oversized sale `quantity` causes a DB overflow and a 500 | Fixed: serializer `max_value`, plus a test |
| PO detail stale after a 409; no polling on the detail page | Fixed: invalidate on settle, poll the detail |
| No concurrency tests for receiving, cancelling or delivery vs sale | Fixed: three threaded tests; the race helper is shared and looped |
| Receive form silently dropped invalid lines | Fixed: send them and let the backend's 400 explain |
| No DB constraint on PO `status`; open-filter test missed `received` | Fixed |
| Deliveries not idempotent | Documented as a known limitation, with the fix (client delivery id) |
| Reused `external_id` with a different payload returns 200 | Documented |

Lesson: the agents' own tests covered the sales race but not the purchasing races. A second set of eyes with no build context found the gap.

## Session 4 — Supplier ↔ ingredient mapping

### Prompt 7 — think it through

> Don't we need to map suppliers with which ingredients they can supply? Two suppliers can supply the same product.

The AI agreed the real model is many-to-many and laid out three options: document it only, a minimal mapping, or a full supplier catalog with price and pack size. It recommended documenting only (YAGNI, and the brief doesn't ask for it).

### Prompt 8 — decision

> Do the minimal mapping, update docs and plans; the PO form should only show the selected supplier's items.

I overruled the recommendation: ordering beef from the bakery is a real mistake the UI should prevent. Design decisions:

- An explicit `SupplierItem` through model, not a plain many-to-many, so price and pack size can be added to it later.
- The rule lives in the purchasing service (409 `ingredient_not_supplied`) and is checked only at PO creation, so editing a supplier's list never breaks open orders. The PO form's filtering is display only.

The contract was updated first. The backend and frontend agents then built in parallel. This time the agents didn't touch git; the orchestrator reviewed and committed each side, which avoided the shared-tree clashes from session 2.

**Agents' notes worth keeping:** the supplier's `ingredients` come back ordered by ingredient name, so the UI treats them as a set. Unticking everything leaves a supplier that can't be used on any new PO, which is allowed.

## Session 5 — Upgrade, hardening, duplicates, performance

### Prompt 9 — design

> Enhance the layout to a modern one.

Done by the orchestrator alone: everything visual already lived in shared components, so pages didn't change. It checked the result in headless Chrome at desktop and true phone width. The first phone screenshot overflowed; the cause was a flex child without `min-w-0`, plus headless Chrome's minimum window width hiding the real layout (checked again inside a 390px iframe).

### Prompt 10 — latest stack, security, N+1, duplicates, performance

> Why Python 3.13 when 3.15 exists, why not Postgres 17? Upgrade to the latest. Scan BE and FE for vulnerabilities and health issues, no N+1, avoid duplicate purchase orders, and improve DB and FE performance.

The orchestrator checked the registries before planning. Postgres 18 is the latest stable, not 17; 19 is only in beta. Python 3.15.0 is about two weeks old, but every dependency installs on it. It then changed the contract first (idempotency for POs and deliveries, `idempotency_conflict`, `/api/health/`), plus Compose and the Makefile. The two agents worked in parallel without touching git, and the orchestrator verified and committed.

**Where the agents pushed back or found something real:**

- TypeScript 7 can't sit alongside typescript-eslint (which needs TS < 6.1). The agent kept TS 7 for the build and installed the TS 6 API for ESLint, rather than using `--force`.
- Vite with `--host 0.0.0.0` listens on IPv4 only, so a `localhost` healthcheck inside the container would never pass.
- The delivery duplicate check has to run after taking the PO lock. Otherwise a retry that waited for the first attempt fails with `over_receipt` instead of returning the original.
- Read endpoints were already N+1-free. The write paths weren't: their query count grew with the number of lines. Fixed with bulk operations, and query-count tests now pin both.
- `check --deploy` had failed all along (no SecurityMiddleware, insecure defaults). Settings now fail fast without a secret key or an explicit host list when debug is off.

**Verification:** each race test was checked by removing its guard (the `IntegrityError` fallback, the lock order, the unique constraint) and watching the test fail. Then a full-stack end-to-end run went through the Vite proxy: PO created once, delivery applied once, a changed payload got 409.

### Prompt 11 — caching and background jobs

> Do we need caching, or scheduled/delayed jobs with Celery?

The AI recommended neither for now, with clear triggers for each:

- **Caching:** a server-side cache on stock fights the product's promise that the number can be trusted. The cheap caches are already there: `on_hand` is a running total, and the browser keeps query results.
- **Background jobs:** every current flow must be synchronous and in one transaction. The roadmap items that do need them (POS webhook inbox, low-stock emails, nightly reconciliation) should start on Django's built-in tasks with a database-backed queue, so jobs are saved in the same transaction as the data, before reaching for Celery.

### Prompt 12 — pagination everywhere

> Paginate every listing page and avoid overloading the backend and frontend.

The contract was changed first, with one pagination style per growth pattern:

- **Cursor** for purchase orders and sales: they grow without limit, there's no `COUNT(*)`, and pages stay stable while polling.
- **Page numbers + search** for the catalog.
- **`/options/` endpoints** for form pickers, because a paginated dropdown is unusable.

Two things were caught in review and sent back to the agents:

- The frontend still decided "out of stock" itself. The backend now sends `out_of_stock` and `in_stock`.
- The frontend stored whole cursor links in the URL. It now stores only the token.

The backend agent ran `EXPLAIN` on every list and added the one index that was missing (`purchase_order_newest`). It also flagged honestly that DRF's cursor can shift one row on an exact timestamp tie. This is documented, with the strict keyset fix.
