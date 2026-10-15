# fudoo-be — Implementation Plan

Django 5.2 + DRF + PostgreSQL 16. Modular monolith, one Django app per module. Contract: `../docs/api-contract.md`. Rules: `../AGENTS.md`.

## Modules

| App | Owns | Depends on |
|---|---|---|
| `core` | `DomainError`, 409 exception handler, shared `QuantityField` | — |
| `catalog` | Ingredient, Supplier, MenuItem, RecipeLine | core |
| `inventory` | StockMovement, `stock.increase()` / `stock.decrease()` | catalog |
| `purchasing` | PurchaseOrder, POLine, Delivery, DeliveryLine, state machine, `receive_delivery()` | catalog, inventory |
| `sales` | Sale, `record_sale()` | catalog, inventory |

Only `inventory` writes `Ingredient.on_hand`. Views are thin: parse → service → serialize.

## Build order (one commit + push per step)

1. **Scaffold:** project `config/`, settings from `DATABASE_URL`, `core` (errors and handler), pytest setup, Dockerfile.
2. **catalog:** models, serializers, list/create endpoints, recipe validation (non-empty, positive, unique ingredient).
3. **inventory:** StockMovement, locked increase/decrease, `on_hand >= 0` check constraint.
4. **purchasing:** transition table, actions endpoint, `allowed_actions`, receiving with over-receipt guard, auto status, `?status=open`.
5. **sales:** idempotent `record_sale` with all-or-nothing deduction and shortages in the 409.
6. **seed:** idempotent `manage.py seed` command.

## Key tests

- State machine: every legal move, and every illegal move → `invalid_transition`.
- Receiving: partial → `received`, rest → `closed`; over-receipt → 409 with nothing applied; draft/closed/cancelled → `po_not_receivable`.
- Sales: deducts recipe × qty; shortage → 409 with nothing deducted; duplicate `external_id` → 200 with no second deduction.
- Ledger: `on_hand == SUM(movements)` after mixed operations.
- Concurrency: two sales racing for the last stock cannot both succeed.

## Run

`make test-be` (pytest against Postgres in Docker).
