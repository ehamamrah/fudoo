# fudoo-be — Implementation Plan

Python 3.15 + Django 6.1 + DRF 3.18 + PostgreSQL 18. Modular monolith, one Django app per module. Contract: `../docs/api-contract.md`. Rules: `../AGENTS.md`.

## Modules

| App | Owns | Depends on |
|---|---|---|
| `core` | `DomainError`, 409 exception handler, `QuantityField`, `create_once` idempotency, bulk id resolution, `/api/health/` | — |
| `catalog` | Ingredient, Supplier, SupplierItem, MenuItem, RecipeLine, AddOn, AddOnRecipeLine | core |
| `inventory` | StockMovement, `stock.increase()` / `stock.decrease()`, locked allocation for orders | catalog |
| `purchasing` | PurchaseOrder, POLine, Delivery, DeliveryLine, state machine, `receive_delivery()` | catalog, inventory |
| `sales` | Order, OrderLine, OrderLineAddOn, `record_order()` | catalog, inventory |

Only `inventory` writes `Ingredient.on_hand`. Views are thin: parse → service → serialize.

## Build order (one commit + push per step)

1. **Scaffold:** [done] project `config/`, settings from `DATABASE_URL`, `core` (errors and handler), pytest setup, Dockerfile.
2. **catalog:** [done] models, serializers, list/create endpoints, recipe validation (non-empty, positive, unique ingredient).
3. **inventory:** [done] StockMovement, locked increase/decrease, `on_hand >= 0` check constraint.
4. **purchasing:** [done] transition table, actions endpoint, `allowed_actions`, receiving with over-receipt guard, auto status, `?status=open`.
5. **sales:** [done] idempotent `record_sale` with all-or-nothing deduction and shortages in the 409.
6. **seed:** [done] idempotent `manage.py seed` command.
7. **supplier items:** [done] supplier ↔ ingredient many-to-many, `GET/PATCH /api/suppliers/{id}/`, `ingredient_not_supplied` on PO creation, seed mappings.
8. **hardening:** [done] Python 3.15 / Django 6.1 / Postgres 18, `request_id` idempotency for POs and deliveries, `idempotency_conflict` for reused ids, `/api/health/`, env-driven security settings, list caps, constant-query write paths, indexes.
9. **pagination:** page-number lists with `?search=` (catalog) and `?stock=out` (ingredients), cursor lists (purchase orders, sales), relative `next`/`previous` links (`core.pagination`), `/options/` pickers, `/api/ingredients/summary/`, supplier `supplies`, indexes `ingredient_name` and `purchase_order_newest`.
10. **add-ons:** `AddOn` + `AddOnRecipeLine` (same rules as menu item recipes), `GET/POST /api/add-ons/` (page numbers + `?search=`), `/api/add-ons/options/`. Share recipe validation and creation with menu items instead of copying it. Seed an "Extra cheese" add-on and a "Cola" menu item (Cola can ingredient, `pcs`).
11. **multi-line orders:** `Order` (`external_id` unique, `status`, `ordered_at`), `OrderLine` (`menu_item`, `quantity`, `status`, `shortages`), `OrderLineAddOn` (`add_on`, `quantity`, `status`, `shortages`). `record_order()` locks every involved ingredient once in id order, allocates in memory in request order (line item, then its add-ons), writes the order and applies all fulfilled deductions in one bulk update. Movements: reason `sale`, references `order-line:<id>` and `order-add-on:<id>`. Data migration turns each `Sale` into a one-line completed `Order` (same `external_id`, `ordered_at = sold_at`), then drops `Sale` and `/api/sales/`. `GET/POST /api/orders/` with cursor pagination and constant query count.

## Key tests

- State machine: every legal move, and every illegal move → `invalid_transition`.
- Receiving: partial → `received`, rest → `closed`; over-receipt → 409 with nothing applied; draft/closed/cancelled → `po_not_receivable`.
- Orders: each fulfilled line deducts recipe × qty and each fulfilled add-on add-on recipe × add-on qty × line qty; a short menu item skips its line and add-ons while other lines go through; a short add-on is skipped and its line stays fulfilled; lines compete in request order for a shared ingredient; every line short → 409 with no rows written; status `completed` vs `partial`; a retry returns the original outcome after stock changed; different lines with the same `external_id` → 409 `idempotency_conflict`; add-on order inside a line doesn't affect idempotency.
- Migration: existing sales become one-line completed orders with the same `external_id` and time.
- Ledger: `on_hand == SUM(movements)` after mixed operations.
- Concurrency: two orders racing for the last stock cannot both fulfil the same line; identical PO/delivery/sale requests racing create and apply exactly once.
- Query counts: every list/detail/write endpoint is asserted constant for 1 and 6 rows.

## Notes

- The `on_hand >= 0` check constraint lives on `catalog.Ingredient` (migration `catalog/0002`) and was added in the inventory step.
- Stock movements carry `reason` (`delivery` | `sale`) and a `reference` (`delivery:<id>`, `order-line:<id>`, `order-add-on:<id>`; older rows keep `sale:<id>`) instead of foreign keys, so `inventory` does not depend on `purchasing` or `sales`.
- `Supplier.ingredients` goes through an explicit `SupplierItem` model (unique per supplier and ingredient) so price and pack size can be added there later without a data migration of the M2M table.
- The "supplier must supply every line's ingredient" rule lives in `purchasing.services.create_purchase_order` (not the serializer) and is checked only at creation; removing a mapping later does not touch existing orders.
- Idempotency lives in `core.idempotency.create_once(find, create, matches)`: look up the id, else create inside an atomic block guarded by a unique constraint; a lost race surfaces as `IntegrityError` and resolves to the winner's row. A different payload raises `idempotency_conflict`. Deliveries run it under the PO row lock so a retry that waited for the first attempt replays it instead of failing `over_receipt`/`po_not_receivable`.
- Input lists (PO lines, delivery lines, recipe, supplier ingredients) are capped at 100 and their ids resolved with one `in_bulk` query.
- `seed` creates catalog data only; stock starts at zero and enters through deliveries so the ledger stays the single source of `on_hand`.

## Run

`make test-be` (pytest against Postgres in Docker). `make audit-be` (pip-audit, bandit, `check --deploy`). Dev/audit tools are in `requirements-dev.txt`, which the image installs.
