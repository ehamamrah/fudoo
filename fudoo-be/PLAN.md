# fudoo-be — Implementation Plan

Django 5.2 + DRF + PostgreSQL 16. Modular monolith, one Django app per module. Contract: `../docs/api-contract.md`. Rules: `../AGENTS.md`.

## Modules

| App | Owns | Depends on |
|---|---|---|
| `core` | `DomainError`, 409 exception handler, shared `QuantityField` | — |
| `catalog` | Ingredient, Supplier, SupplierItem, MenuItem, RecipeLine | core |
| `inventory` | StockMovement, `stock.increase()` / `stock.decrease()` | catalog |
| `purchasing` | PurchaseOrder, POLine, Delivery, DeliveryLine, state machine, `receive_delivery()` | catalog, inventory |
| `sales` | Sale, `record_sale()` | catalog, inventory |

Only `inventory` writes `Ingredient.on_hand`. Views are thin: parse → service → serialize.

## Build order (one commit + push per step)

1. **Scaffold:** [done] project `config/`, settings from `DATABASE_URL`, `core` (errors and handler), pytest setup, Dockerfile.
2. **catalog:** [done] models, serializers, list/create endpoints, recipe validation (non-empty, positive, unique ingredient).
3. **inventory:** [done] StockMovement, locked increase/decrease, `on_hand >= 0` check constraint.
4. **purchasing:** [done] transition table, actions endpoint, `allowed_actions`, receiving with over-receipt guard, auto status, `?status=open`.
5. **sales:** [done] idempotent `record_sale` with all-or-nothing deduction and shortages in the 409.
6. **seed:** [done] idempotent `manage.py seed` command.
7. **supplier items:** [done] supplier ↔ ingredient many-to-many, `GET/PATCH /api/suppliers/{id}/`, `ingredient_not_supplied` on PO creation, seed mappings.

## Key tests

- State machine: every legal move, and every illegal move → `invalid_transition`.
- Receiving: partial → `received`, rest → `closed`; over-receipt → 409 with nothing applied; draft/closed/cancelled → `po_not_receivable`.
- Sales: deducts recipe × qty; shortage → 409 with nothing deducted; duplicate `external_id` → 200 with no second deduction.
- Ledger: `on_hand == SUM(movements)` after mixed operations.
- Concurrency: two sales racing for the last stock cannot both succeed.

## Notes

- The `on_hand >= 0` check constraint lives on `catalog.Ingredient` (migration `catalog/0002`) and was added in the inventory step.
- Stock movements carry `reason` (`delivery` | `sale`) and a `reference` (`delivery:<id>`, `sale:<id>`) instead of foreign keys, so `inventory` does not depend on `purchasing` or `sales`.
- `Supplier.ingredients` goes through an explicit `SupplierItem` model (unique per supplier and ingredient) so price and pack size can be added there later without a data migration of the M2M table.
- The "supplier must supply every line's ingredient" rule lives in `purchasing.services.create_purchase_order` (not the serializer) and is checked only at creation; removing a mapping later does not touch existing orders.
- `seed` creates catalog data only; stock starts at zero and enters through deliveries so the ledger stays the single source of `on_hand`.

## Run

`make test-be` (pytest against Postgres in Docker).
