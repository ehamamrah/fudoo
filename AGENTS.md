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
6. A sale is all-or-nothing: either every recipe ingredient is deducted, or nothing is.

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
- Before pushing: `git pull --rebase origin main`, then `git push origin main`. If `index.lock` exists, wait and retry.
- Conventional commits: `feat(be): ...`, `feat(fe): ...`, `test(be): ...`, `chore: ...`.
