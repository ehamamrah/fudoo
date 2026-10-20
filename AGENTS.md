# Fudoo — Engineering Conventions

Inventory and purchasing service for a single-branch burger restaurant.
Modular monolith: one Django backend (`fudoo-be`), one React frontend (`fudoo-fe`), one PostgreSQL database.

The API contract in `docs/api-contract.md` is the single source of truth between backend and frontend.
Neither side changes it unilaterally: propose a change in your report and the orchestrator updates it.

## Code rules (non-negotiable)

- No function or method body longer than 15 lines. Extract well-named helpers instead.
- No explanatory or redundant comments. Names carry the meaning. Docstrings only where a non-obvious business rule needs stating.
- SOLID, KISS, YAGNI, DRY. Build only what the brief or the contract asks for.
- Business rules live in one place (backend service layer). The frontend never re-implements them.
- Every change that touches stock or order state ships with tests in the same commit.

## Domain invariants

1. Stock never goes below zero. Enforced in the service layer and by a database check constraint.
2. Every stock change writes a `StockMovement` row in the same transaction as the `Ingredient.on_hand` update. `on_hand` always equals the sum of its movements.
3. `0 <= quantity_received <= quantity_ordered` on every purchase order line.
4. Purchase order status changes only through the state machine. No direct `status` writes anywhere else.
5. Quantities are `Decimal`, never float. Serialized as strings in JSON.
6. An order is fulfilled line by line, in request order. A line's menu item is all-or-nothing (recipe × quantity); each add-on on it is all-or-nothing on its own. A short menu item skips its line and that line's add-ons; a short add-on skips only itself. If no line can be fulfilled, nothing is recorded (`409 insufficient_stock`).
7. A recorded order never changes: its line and add-on outcomes are final, and an idempotent retry returns them as recorded.

## Purchase order state machine

```
draft ──send──▶ sent ──delivery (partial)──▶ received ──delivery (rest)──▶ closed
  │              │  └──delivery (full)───────────────────────────────────▶ closed
  │              │                              └──close (short-close)───▶ closed
  └──cancel──────┴──cancel──▶ cancelled
```

Manual transitions: `draft→sent`, `draft→cancelled`, `sent→cancelled`, `received→closed`.
Delivery-driven transitions: `sent→received`, `sent→closed`, `received→closed`.
`closed` and `cancelled` are terminal.

## Runtime

- `docker compose up` starts `db` (postgres:18, port 5432), `be` (Django, port 8000), `fe` (Vite, port 5173).
- The frontend calls relative `/api/...`. Vite proxies `/api` to `http://be:8000`, so there is no CORS setup.
- Backend tests: `make test-be`. Frontend tests: `make test-fe`.

## Git workflow

- Single branch: `main`. No PRs. Commit and push per completed module.
- Stage only your own app directory: `git add fudoo-be/` or `git add fudoo-fe/`. Never `git add -A` or `git add .`.
- Agents share one working tree and index. Commit with a path filter (`git commit -- fudoo-be/`) so another agent's staged files never land in your commit. Never stash, reset or discard files outside your directory; if `git pull --rebase` refuses because of them, `git fetch` and rebase only if origin is ahead.
- Before pushing: `git pull --rebase origin main`, then `git push origin main`. If `index.lock` exists, wait and retry.
- Conventional commits: `feat(be): ...`, `feat(fe): ...`, `test(be): ...`, `chore: ...`.
