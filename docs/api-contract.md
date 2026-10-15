# API Contract v1

Base path: `/api`. JSON only. No authentication. Every list endpoint is paginated (see Pagination).
Quantities are decimal strings with up to 3 decimal places, e.g. `"150.000"`. Requests may send numbers or strings.

## Errors

| Status | When | Body |
|---|---|---|
| 400 | Invalid input (field validation) | DRF default: `{"field": ["message"]}` |
| 404 | Unknown id | `{"detail": "Not found."}` |
| 409 | Valid input that breaks a business rule | `{"code": "<error_code>", "detail": "<human message>"}` |

409 codes: `invalid_transition`, `po_not_receivable`, `over_receipt`, `insufficient_stock`, `ingredient_not_supplied`, `idempotency_conflict`.
`insufficient_stock` additionally carries `"shortages": [{"ingredient": 1, "name": "Beef", "required": "300.000", "available": "120.000"}]`.

Limits: at most 100 items in any list (PO lines, delivery lines, recipe lines, supplier `ingredients`); unknown ids inside a list → `400 {"lines": ["Unknown ids: [n]."]}`.

## Pagination

Two styles, chosen by how the data grows:

**Page numbers**, for the catalog (ingredients, suppliers, menu items): `?page=1&page_size=25`. `page_size` defaults to 25, max 100. Response:

```json
{"count": 132, "next": "/api/ingredients/?page=3", "previous": "/api/ingredients/", "results": [ ... ]}
```

`next` and `previous` are `null` at either end and keep the other query params (`page_size` only if sent). A page past the end or a non-numeric page → `404 {"detail": "Invalid page."}`. A `page_size` of 0 or not a number falls back to 25; above 100 is capped at 100. An unknown `?stock=` value or a search over 100 characters → 400. These lists also take `?search=<text>`: a case-insensitive "name contains" match, trimmed, max 100 characters.

**Cursor**, for purchase orders and sales (newest first, they grow without limit and change while the page is polled): `?cursor=<opaque>&page_size=25`. `page_size` defaults to 25, max 100. Response:

```json
{"next": "/api/sales/?cursor=cD0yMDI2…", "previous": null, "results": [ ... ]}
```

There is no `count`, which avoids a `COUNT(*)` over a growing table. The client follows `next` / `previous` exactly as given. New rows arriving while you page don't shift or duplicate the rows on a page. Exception: a row with exactly the same timestamp as a page boundary, or a late-committing row older than the cursor; the strict fix is a custom keyset on `(timestamp, id)`. An invalid cursor → `404 {"detail": "Invalid cursor"}`.

**Options**, for pickers in forms (selects and checklists), which need the whole set but only names: `GET /api/ingredients/options/`, `/api/suppliers/options/`, `/api/menu-items/options/` → `200 [{"id": 1, "name": "Beef"}]` ordered by name, not paginated. Ingredient options also carry `unit` and accept `?supplier=<id>` (only what that supplier supplies; an unknown supplier → `[]`, a non-numeric or non-positive id → 400).

## Idempotency (no duplicates on retry)

Every request that creates something carries a client-generated id: `request_id` for purchase orders and deliveries, `external_id` for sales. It is a string of 1–64 characters (the UI sends a UUID). The client keeps the same id when it retries an attempt and makes a new one only after a success.

- Same id + same payload → the original result with `200`. Nothing is created or applied twice, including when the two requests arrive concurrently.
- Same id + a different payload → `409 idempotency_conflict`. Nothing changes.

## Ingredients

`GET /api/ingredients/` → `200 Page[Ingredient]` ordered by name; `?search=`, and `?stock=out` for only `on_hand = 0`
`GET /api/ingredients/summary/` → `200 {"total": 8, "in_stock": 1, "out_of_stock": 7}` (one aggregate query, for the stock page cards)
`POST /api/ingredients/` body `{"name": "Beef", "unit": "g"}` → `201 Ingredient`

```json
{"id": 1, "name": "Beef", "unit": "g", "on_hand": "0.000", "out_of_stock": true}
```
- `unit` ∈ `g`, `ml`, `pcs`. `name` unique (case-insensitive). `on_hand` and `out_of_stock` read-only; the UI shows stock status from `out_of_stock`, never by comparing numbers itself.

## Suppliers

`GET /api/suppliers/` → `200 Page[Supplier]` ordered by name; `?search=`
`POST /api/suppliers/` body `{"name": "Meat Co", "contact": "orders@meatco.test", "ingredients": [1, 3]}` → `201 Supplier`
`GET /api/suppliers/{id}/` → `200 Supplier`
`PATCH /api/suppliers/{id}/` body `{"ingredients": [1, 3, 4]}` → `200 Supplier`

```json
{"id": 1, "name": "Meat Co", "contact": "orders@meatco.test", "ingredients": [1, 3], "supplies": [{"id": 1, "name": "Beef"}, {"id": 3, "name": "Cheddar"}]}
```
- `name` unique. `contact` optional free text.
- `ingredients` is the list of ingredient ids this supplier can supply. Optional on create (defaults to `[]`). On PATCH it **replaces** the whole list. Unknown ids → 400. An ingredient can be supplied by many suppliers.
- PATCH may also change `name` or `contact`.
- `supplies` is read-only: the same ingredients with names, ordered by name, so the list can show them without loading every ingredient.

## Menu items (recipes)

`GET /api/menu-items/` → `200 Page[MenuItem]` ordered by name; `?search=`
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

`GET /api/purchase-orders/` → `200 CursorPage[PurchaseOrder]` newest first
`GET /api/purchase-orders/?status=open` → only `sent` and `received` (same cursor pagination)
`GET /api/purchase-orders/{id}/` → `200 PurchaseOrder`
`POST /api/purchase-orders/` body `{"request_id": "b3c1…", "supplier": 1, "lines": [{"ingredient": 1, "quantity_ordered": "5000"}]}` → `201 PurchaseOrder` in `draft` (or `200` for a repeated `request_id`, see Idempotency)

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

`POST /api/purchase-orders/{id}/deliveries/` → `201 PurchaseOrder` (or `200` for a repeated `request_id`)

```json
{"request_id": "9f2a…", "lines": [{"line": 11, "quantity": "2000"}]}
```
- `request_id` required. A repeat for the same order and lines returns the order as it is now and applies nothing; reusing it for another order or other lines → `409 idempotency_conflict`.
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
- `quantity` positive integer (max 10,000). `external_id` required, unique: a retry is idempotent and deducts nothing. The same `external_id` with a different `menu_item` or `quantity` → `409 idempotency_conflict`.
- If any ingredient lacks stock for `recipe quantity × quantity` → `409 insufficient_stock`; nothing is deducted.

`GET /api/sales/` → `200 CursorPage[Sale]` newest first.

## Stock

Current stock is `on_hand` on `GET /api/ingredients/`. The UI polls only the page on screen (and the summary) every 5 seconds and after every mutation.

## Health

`GET /api/health/` → `200 {"status": "ok", "database": "ok"}` when the API can query the database, otherwise `503 {"status": "error", "database": "unavailable"}`. Used by the Docker healthchecks.
