# API Contract v1

Base path: `/api`. JSON only. No authentication. No pagination.
Quantities are decimal strings with up to 3 decimal places, e.g. `"150.000"`. Requests may send numbers or strings.

## Errors

| Status | When | Body |
|---|---|---|
| 400 | Invalid input (field validation) | DRF default: `{"field": ["message"]}` |
| 404 | Unknown id | `{"detail": "Not found."}` |
| 409 | Valid input that breaks a business rule | `{"code": "<error_code>", "detail": "<human message>"}` |

409 codes: `invalid_transition`, `po_not_receivable`, `over_receipt`, `insufficient_stock`, `ingredient_not_supplied`.
`insufficient_stock` additionally carries `"shortages": [{"ingredient": 1, "name": "Beef", "required": "300.000", "available": "120.000"}]`.

## Ingredients

`GET /api/ingredients/` → `200 [Ingredient]` ordered by name
`POST /api/ingredients/` body `{"name": "Beef", "unit": "g"}` → `201 Ingredient`

```json
{"id": 1, "name": "Beef", "unit": "g", "on_hand": "0.000"}
```
- `unit` ∈ `g`, `ml`, `pcs`. `name` unique (case-insensitive). `on_hand` read-only.

## Suppliers

`GET /api/suppliers/` → `200 [Supplier]` ordered by name
`POST /api/suppliers/` body `{"name": "Meat Co", "contact": "orders@meatco.test", "ingredients": [1, 3]}` → `201 Supplier`
`GET /api/suppliers/{id}/` → `200 Supplier`
`PATCH /api/suppliers/{id}/` body `{"ingredients": [1, 3, 4]}` → `200 Supplier`

```json
{"id": 1, "name": "Meat Co", "contact": "orders@meatco.test", "ingredients": [1, 3]}
```
- `name` unique. `contact` optional free text.
- `ingredients` is the list of ingredient ids this supplier can supply. Optional on create (defaults to `[]`). On PATCH it **replaces** the whole list. Unknown ids → 400. An ingredient can be supplied by many suppliers.
- PATCH may also change `name` or `contact`.

## Menu items (recipes)

`GET /api/menu-items/` → `200 [MenuItem]` ordered by name
`POST /api/menu-items/` → `201 MenuItem`

```json
{
  "id": 1,
  "name": "Classic Burger",
  "recipe": [
    {"ingredient": 1, "ingredient_name": "Beef", "unit": "g", "quantity": "150.000"},
    {"ingredient": 2, "ingredient_name": "Bun", "unit": "pcs", "quantity": "1.000"}
  ]
}
```
- Request body: `{"name": "...", "recipe": [{"ingredient": 1, "quantity": "150"}]}`.
- `recipe` non-empty, quantity > 0, an ingredient appears at most once. `name` unique.

## Purchase orders

`GET /api/purchase-orders/` → `200 [PurchaseOrder]` newest first
`GET /api/purchase-orders/?status=open` → only `sent` and `received`
`GET /api/purchase-orders/{id}/` → `200 PurchaseOrder`
`POST /api/purchase-orders/` body `{"supplier": 1, "lines": [{"ingredient": 1, "quantity_ordered": "5000"}]}` → `201 PurchaseOrder` in `draft`

```json
{
  "id": 7,
  "supplier": 1,
  "supplier_name": "Meat Co",
  "status": "received",
  "created_at": "2026-10-15T10:00:00Z",
  "lines": [
    {
      "id": 11,
      "ingredient": 1,
      "ingredient_name": "Beef",
      "unit": "g",
      "quantity_ordered": "5000.000",
      "quantity_received": "3000.000",
      "quantity_outstanding": "2000.000"
    }
  ],
  "allowed_actions": ["close"],
  "can_receive": true
}
```
- `lines` non-empty, quantity_ordered > 0, an ingredient appears at most once.
- Every line's ingredient must be in the supplier's `ingredients`, else `409 ingredient_not_supplied` (detail names the ingredients) and nothing is created. Checked only at creation; later mapping changes don't affect existing orders.
- `allowed_actions` lists the manual actions valid from the current status. The UI renders buttons from it.
- `can_receive` is true when a delivery may be recorded (`sent` or `received`). The UI shows the receive form from it.

### Manual transition

`POST /api/purchase-orders/{id}/actions/` body `{"action": "send" | "cancel" | "close"}` → `200 PurchaseOrder`
- `send`: draft→sent. `cancel`: draft|sent→cancelled. `close`: received→closed (short-close).
- Anything else → `409 invalid_transition`.

### Receive a delivery

`POST /api/purchase-orders/{id}/deliveries/` → `201 PurchaseOrder`

```json
{"lines": [{"line": 11, "quantity": "2000"}]}
```
- PO must be `sent` or `received`, else `409 po_not_receivable`.
- Each `line` must belong to this PO (else 400), quantity > 0, no duplicate lines.
- Quantity above outstanding → `409 over_receipt`; nothing is applied.
- Stock increases by the quantities received. Status becomes `closed` when every line is fully received, otherwise `received`.

## Sales (POS)

`POST /api/sales/` → `201 Sale` (new) or `200 Sale` (same `external_id` already recorded)

```json
{"external_id": "pos-2026-10-15-0001", "menu_item": 1, "quantity": 2}
```
Response:
```json
{"id": 3, "external_id": "pos-2026-10-15-0001", "menu_item": 1, "menu_item_name": "Classic Burger", "quantity": 2, "sold_at": "2026-10-15T12:00:00Z"}
```
- `quantity` positive integer. `external_id` required, unique: a retry is idempotent and deducts nothing.
- If any ingredient lacks stock for `recipe quantity × quantity` → `409 insufficient_stock`; nothing is deducted.

`GET /api/sales/` → `200 [Sale]` newest first, latest 50.

## Stock

Current stock is `on_hand` on `GET /api/ingredients/`. The UI polls it every 5 seconds and after every mutation.
