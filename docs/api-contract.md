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

Limits: at most 100 items in any list (PO lines, delivery lines, recipe lines, order lines, supplier `ingredients`); unknown ids inside a list → `400 {"lines": ["Unknown ids: [n]."]}`.

## Pagination

Two styles, chosen by how the data grows:

**Page numbers**, for the catalog (ingredients, suppliers, menu items, add-ons): `?page=1&page_size=25`. `page_size` defaults to 25, max 100. Response:

```json
{"count": 132, "next": "/api/ingredients/?page=3", "previous": "/api/ingredients/", "results": [ ... ]}
```

`next` and `previous` are `null` at either end and keep the other query params (`page_size` only if sent). A page past the end or a non-numeric page → `404 {"detail": "Invalid page."}`. A `page_size` of 0 or not a number falls back to 25; above 100 is capped at 100. An unknown `?stock=` value or a search over 100 characters → 400. These lists also take `?search=<text>`: a case-insensitive "name contains" match, trimmed, max 100 characters.

**Cursor**, for purchase orders and orders (newest first, they grow without limit and change while the page is polled): `?cursor=<opaque>&page_size=25`. `page_size` defaults to 25, max 100. Response:

```json
{"next": "/api/orders/?cursor=cD0yMDI2…", "previous": null, "results": [ ... ]}
```

There is no `count`, which avoids a `COUNT(*)` over a growing table. The client follows `next` / `previous` exactly as given. New rows arriving while you page don't shift or duplicate the rows on a page. Exception: a row with exactly the same timestamp as a page boundary, or a late-committing row older than the cursor; the strict fix is a custom keyset on `(timestamp, id)`. An invalid cursor → `404 {"detail": "Invalid cursor"}`.

**Options**, for pickers in forms (selects and checklists), which need the whole set but only names: `GET /api/ingredients/options/`, `/api/suppliers/options/`, `/api/menu-items/options/`, `/api/add-ons/options/` → `200 [{"id": 1, "name": "Beef"}]` ordered by name, not paginated. Ingredient options also carry `unit` and accept `?supplier=<id>` (only what that supplier supplies; an unknown supplier → `[]`, a non-numeric or non-positive id → 400).

## Idempotency (no duplicates on retry)

Every request that creates something carries a client-generated id: `request_id` for purchase orders and deliveries, `external_id` for orders. It is a string of 1–64 characters (the UI sends a UUID). The client keeps the same id when it retries an attempt and makes a new one only after a success.

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

## Add-ons

`GET /api/add-ons/` → `200 Page[AddOn]` ordered by name; `?search=`
`GET /api/add-ons/options/` → `200 [{"id": 1, "name": "Extra cheese"}]` (see Options)
`POST /api/add-ons/` → `201 AddOn`

```json
{"id": 1, "name": "Extra cheese", "recipe": [{"ingredient": 3, "ingredient_name": "Cheddar", "unit": "pcs", "quantity": "1.000"}]}
```
- Request body and rules are the same as menu items: `{"name": "...", "recipe": [{"ingredient": 3, "quantity": "1"}]}`, `recipe` non-empty, quantity > 0, an ingredient at most once, `name` unique.
- An add-on is never sold alone. Any add-on may be attached to any order line.

## Orders (POS)

`POST /api/orders/` → `201 Order` (new) or `200 Order` (same `external_id` already recorded)

```json
{"external_id": "pos-2026-10-20-0042", "lines": [
  {"menu_item": 1, "quantity": 2, "add_ons": [{"add_on": 1, "quantity": 1}]},
  {"menu_item": 4, "quantity": 1}
]}
```
Response:
```json
{
  "id": 7,
  "external_id": "pos-2026-10-20-0042",
  "status": "partial",
  "ordered_at": "2026-10-20T12:00:00Z",
  "lines": [
    {
      "id": 12, "menu_item": 1, "menu_item_name": "Classic Burger", "quantity": 2, "status": "fulfilled", "shortages": [],
      "add_ons": [
        {"id": 3, "add_on": 1, "add_on_name": "Extra cheese", "quantity": 1, "status": "skipped",
         "shortages": [{"ingredient": 3, "name": "Cheddar", "required": "2.000", "available": "1.000"}]}
      ]
    },
    {"id": 13, "menu_item": 4, "menu_item_name": "Cola", "quantity": 1, "status": "fulfilled", "shortages": [], "add_ons": []}
  ]
}
```

Input:
- `lines`: 1–100 lines, kept in the order sent. The same menu item may appear on several lines.
- `quantity` (line): positive integer, max 10,000. `add_ons` optional (default `[]`), at most 10 per line, an add-on at most once per line (else 400). Add-on `quantity`: positive integer, max 10, counted **per unit** of the line (2 burgers + 1 extra cheese uses the cheese recipe twice).
- Unknown menu item or add-on ids → `400 {"lines": ["Unknown ids: [n]."]}`.

Fulfilment (the backend decides; the UI only shows `status` and `shortages`):
- The stock is checked in the order of the request: line 1's menu item, then line 1's add-ons in the order sent, then line 2, and so on. Each check uses the stock left after everything earlier in the same order.
- A line's menu item is all-or-nothing: recipe × line quantity. If any ingredient is short, the line is `skipped`, and so are all its add-ons (with empty `shortages`).
- Each add-on is all-or-nothing: add-on recipe × add-on quantity × line quantity. If short, only that add-on is `skipped`; the line stays `fulfilled`.
- `shortages` on a skipped line or add-on lists the short ingredients: `required` for that line or add-on, and `available` at the moment it was checked.
- Order `status` is `completed` when every line and add-on is `fulfilled`, otherwise `partial`.
- If no line's menu item can be fulfilled → `409 insufficient_stock` and nothing is recorded or deducted, so the same `external_id` can be retried later. `shortages` then lists every short ingredient once, with `required` summed over the menu items of all lines and `available` the current stock.

Idempotency: the same `external_id` with the same lines (same order of lines, same menu items, quantities and add-ons; the order of add-ons inside a line doesn't matter) → `200` with the original order exactly as it was recorded, even if stock has changed since. The same `external_id` with different lines → `409 idempotency_conflict`.

`GET /api/orders/` → `200 CursorPage[Order]` newest first, with lines and add-ons embedded.

`/api/sales/` is removed. Sales recorded before this change appear as one-line `completed` orders with the same `external_id` and `ordered_at` equal to their old `sold_at`.

## Stock

Current stock is `on_hand` on `GET /api/ingredients/`. The UI polls only the page on screen (and the summary) every 5 seconds and after every mutation.

## Health

`GET /api/health/` → `200 {"status": "ok", "database": "ok"}` when the API can query the database, otherwise `503 {"status": "error", "database": "unavailable"}`. Used by the Docker healthchecks.
