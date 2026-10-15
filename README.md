# Fudoo

Inventory and purchasing service for a single-branch burger restaurant. It tracks ingredients, suppliers, recipes, purchase orders, partial deliveries and POS sales, so the owner always knows what is in the storeroom and which orders are still open.

- **Backend:** Python 3.13, Django 5.2, Django REST Framework, PostgreSQL 16 (`fudoo-be/`)
- **Frontend:** React 18, TypeScript, Vite, Tailwind, TanStack Query (`fudoo-fe/`)
- **Runtime:** Docker Compose

## Run it

Requires Docker.

```bash
make up      # postgres :5432, API :8000, UI :5173
make seed    # sample ingredients, suppliers with what they supply, and the Classic Burger recipe (idempotent)
```

Open <http://localhost:5173>. Seeded stock starts at zero: create a purchase order, send it and record a delivery to bring stock in, then sell burgers from the **POS** page.

The POS can call the API directly:

```bash
curl -X POST localhost:8000/api/sales/ -H 'Content-Type: application/json' \
  -d '{"external_id": "pos-0001", "menu_item": 1, "quantity": 2}'
```

## Run the tests

```bash
make test-be   # pytest against real Postgres (needed for row locks and DB constraints)
make test-fe   # Vitest + Testing Library
```

The backend tests cover what has to be right: every legal and illegal PO transition, ordering an ingredient the supplier doesn't supply, partial then full receiving, over-receipt, delivery against an order that can't receive, sale deduction, insufficient stock, duplicate POS events, `on_hand` equal to the sum of the ledger, and two concurrency tests using threads (two sales racing for the last stock; the same POS event sent twice at once).

## Architecture

A modular monolith with one Django app per module. Business rules live in each module's `services.py`; views only parse the request, call a service and serialize the result.

| Module | Owns |
|---|---|
| `catalog` | Ingredient, Supplier, SupplierItem (who supplies what), MenuItem, RecipeLine |
| `inventory` | StockMovement ledger, `stock.increase()` / `stock.decrease()` — the **only** code that changes `on_hand` |
| `purchasing` | PurchaseOrder, POLine, Delivery, DeliveryLine, the state machine, receiving |
| `sales` | Sale, idempotent `record_sale()` |
| `core` | `DomainError` → HTTP 409 handler, shared quantity fields |

The frontend has one folder per feature, and each feature has TanStack Query hooks. Pages never call `fetch` directly. The UI holds no business rules: PO buttons come from `allowed_actions` and the receive form from `can_receive`, both computed by the backend state machine. The full API is in [`docs/api-contract.md`](docs/api-contract.md).

## Data model

```text
Supplier ──< SupplierItem >───────────────────┐
   │                                          ▼
   └──< PurchaseOrder ──< POLine >──────── Ingredient ──< StockMovement (ledger)
             │              ▲                 ▲
             └──< Delivery ──< DeliveryLine   │
                                              │
MenuItem ──< RecipeLine >─────────────────────┘
    └──< Sale
```

- `Ingredient.on_hand` is the current stock. Every change to it writes a `StockMovement` row (`+` delivery, `−` sale, with a reference such as `delivery:5`) in the same transaction, so `on_hand` always equals the sum of its movements.
- `SupplierItem` links suppliers and ingredients many-to-many: a supplier lists what it supplies, and one ingredient can come from several suppliers (seeded Cheddar comes from Meat Co and Fresh Farms). A purchase order can only contain ingredients its supplier supplies.
- Quantities are `Decimal(12, 3)` in the ingredient's unit (`g`, `ml`, `pcs`) and are sent as strings in JSON.
- Database constraints back up the code: `on_hand >= 0`, `0 <= quantity_received <= quantity_ordered`, all quantities positive, unique `Sale.external_id`, one line per ingredient in each PO and recipe, one link per supplier and ingredient, and case-insensitive unique ingredient names.

## Purchase order states

```text
draft ──send──▶ sent ──delivery (partial)──▶ received ──delivery (rest)──▶ closed
  │              │  └──delivery (full)───────────────────────────────────▶ closed
  │              │                              └──close (short-close)───▶ closed
  └──cancel──────┴──cancel──▶ cancelled
```

The transitions are a declarative table in `purchasing/state_machine.py`; there is no other way to change `status`. Deliveries set the status automatically; `send`, `cancel` and `close` are manual. `closed` and `cancelled` are final.

## Decisions where the brief was unclear

| Question | Decision | Why |
|---|---|---|
| A sale would take stock below zero | **Reject the whole sale** (409 `insufficient_stock`, listing each shortage). Nothing is deducted. | Stock must never go negative. If the system says there isn't enough, the number is wrong or the item can't be made, and both need attention, not a silent negative. Enforced in the service and by a DB constraint. |
| What "received" and "closed" mean | `received` = partly delivered; `closed` = fully delivered (automatic) or short-closed | Otherwise the two states would mean the same thing. |
| Supplier will never send the rest | Manual **short-close** `received → closed` | Otherwise the order stays open forever. |
| Cancelling | Allowed from `draft` and `sent` only | Once goods have arrived they are in stock; the order is closed instead. |
| Over-delivery | **Rejected** (409 `over_receipt`); the whole delivery is rejected | Keeps `received ≤ ordered`. Extra goods mean amending the order. |
| POS retries | `external_id` is required and unique; a repeat returns the original sale (200) and deducts nothing | Networks retry. Without this, one sale could be deducted twice. |
| Which supplier sells what | Each supplier lists the ingredients it supplies. A PO line for anything else is rejected (409 `ingredient_not_supplied`), and the PO form only offers the chosen supplier's items | Stops ordering beef from the bakery. Checked only when the PO is created, so changing a supplier's list never breaks open orders. `SupplierItem` is a bare link for now; price and pack size go on it later. |
| Editing after creation | No editing or deleting of ingredients, recipes or PO lines (a supplier's list of items is the one exception); a wrong draft PO is cancelled and recreated | The brief asks for create and list. Editing recipes would also raise history questions. |
| Units | One unit per ingredient, no conversions | Out of scope; the recipe uses the same unit as the stock. |
| Up-to-date stock | Stock and open POs refresh every 5 s and after every change, with an "Updated Xs ago" indicator | The brief's "without having to guess". Polling is simpler than websockets and good enough for one branch. |
| Low stock | Only "Out of stock" is shown | A real threshold needs a reorder level per ingredient; deferred. |
| Unknown ids in a request body | 400 (validation); unknown ids in the URL are 404 | DRF's convention. |

## Known limitations

- **Deliveries are not idempotent.** If a delivery request times out after the server committed it and the manager retries, the quantity is booked twice (the over-receipt guard only caps the total at what was ordered). The form disables itself while submitting and the page refetches, which lowers the risk. The real fix is a client-generated delivery id, handled like the POS `external_id`.
- **A reused `external_id` with a different payload** returns the original sale (200) and ignores the new payload. A stricter API would return 409 when the payloads differ.
- **Development setup only:** `runserver`, `DEBUG`, `ALLOWED_HOSTS=*` and a default secret key. There is no authentication, as the brief allows.
- Quantities are capped by `Decimal(12, 3)`; sale quantity is capped at 10,000 per event.

## How I used AI

I used Claude Code throughout: one orchestrator session and two engineer subagents (backend and frontend), defined in [`.claude/agents/`](.claude/agents). The full prompt log, with every place the AI was wrong, is in [`docs/ai-log.md`](docs/ai-log.md).

### Workflow

1. I gave the brief and asked for analysis and a plan before any code.
2. The AI drafted [`AGENTS.md`](AGENTS.md) (code rules and domain invariants) and the API contract. I reviewed and corrected them before any code was written.
3. The two agents built in parallel against the contract, one commit per module.
4. The orchestrator reviewed every module and ran the stack end to end. A separate reviewer agent, which hadn't seen the build, then reviewed the code. Its findings went back to the engineer agents as fixes, or into the limitations above.

### What worked

- Writing the contract first let backend and frontend be built in parallel and fit together the first time.
- Writing the invariants down (no negative stock, ledger equals `on_hand`, status only through the state machine) gave the agents something concrete to test against.
- Asking the backend agent to check its concurrency test by removing the lock. Without the lock the test fails, so it really tests the race.

### What I had to fix or overrule

- I overruled the AI's proposal to allow negative stock.
- The AI's first plan had a small-model "dispatcher" agent. I dropped it, because coordinating the agents needs the most judgment of any role.
- The frontend copied the state machine (a hardcoded list of statuses that can receive) and invented a "low stock" rule from recipes. Both were business rules in the UI. They were replaced by `can_receive` from the API and removed.
- A backend test fixture wrote the PO `status` field directly, bypassing the state machine. It was rewritten to use the real services.
- The two agents shared one git working tree and interfered with each other's commits. Next time each agent gets its own worktree.

## What I'd do next

1. **Stock counts and adjustments:** record what is physically on the shelf and post the difference as an `adjustment` movement. This is the main way to show the numbers can be trusted.
2. **Waste:** record spoiled or dropped ingredients so they don't show up as unexplained differences.
3. **Supplier prices and pack sizes:** price and pack size on `SupplierItem`, so orders are placed in cases and converted to stock units on receipt, with a preferred supplier per ingredient.
4. **Reorder levels:** a threshold per ingredient, low-stock alerts, and a draft PO suggested from them and the preferred supplier.
5. **Stock history page:** the ledger already exists, so show it per ingredient.
6. **Tenancy:** restaurant → branches, with stock, POs and sales belonging to a branch (see [`PLAN.md`](PLAN.md)).
7. **End-to-end tests** with Playwright for the purchase and sale flows; CI running both test suites.
