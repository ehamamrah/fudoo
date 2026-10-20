# fudoo-fe — Implementation Plan

Node 26, Vite 8, React 19, TypeScript 7 (strict), Tailwind 4, TanStack Query 5, React Router 8, ESLint 10. Vitest 5 + Testing Library. Contract: `../docs/api-contract.md`. Rules: `../AGENTS.md`.

## Structure

```
src/
  api/         client.ts (fetch wrapper → typed ApiError), types.ts (mirrors contract), one file per resource
  components/  Button, Field, Table, ErrorBanner, Badge, Page, FormPanel, QueryState, UpdatedAgo
  lib/         display formatting, shared hooks
  features/    stock, ingredients, suppliers, menu-items, add-ons, purchase-orders, orders (POS) — each: hooks.ts + page(s);
               recipes/ holds the catalog page, table and form shared by menu items and add-ons
  App.tsx      router + nav
```

- Pages call feature hooks only; hooks wrap TanStack Query.
- Mutations invalidate affected queries. Stock and open POs poll every 5 s and show "Updated Xs ago".
- No business rules in the UI: PO buttons come from `allowed_actions`, outstanding quantities from the API, errors from `detail` / `shortages`.

## Decisions taken during the build

- Tailwind v4 via `@tailwindcss/vite`, CSS-first: Inter and the orange `brand` palette live in `@theme` in `src/index.css`. Status: all seven steps done.
- TypeScript: `tsc` is TypeScript 7 (package alias `typescript-7`). The `typescript` module name points at `@typescript/typescript6` because typescript-eslint needs the TS 6 JS API (`typescript <6.1`), which TS 7 no longer ships.
- Idempotency: the PO create form, the receive form and the POS cart each hold one id per attempt (`lib/useAttemptId`). Retries reuse it; it is renewed only after a success.
- Each route is its own lazy chunk. Queries default to a 30 s `staleTime`; only stock, open POs and PO detail poll (5 s), never in a background tab.
- PO receive form is shown from the API's `can_receive` flag; action buttons from `allowed_actions`. The UI holds no state-machine knowledge.
- Stock shows Out of stock / In stock only. A "low" threshold needs a backend `reorder_level`; deferred (YAGNI).
- Supplier ingredient filtering in the PO form is display-only, driven by `/api/ingredients/options/?supplier=<id>`. The backend enforces the rule (`409 ingredient_not_supplied`) and the form shows its `detail` verbatim. Changing the supplier resets the lines.
- Pagination: catalog lists (stock, ingredients, suppliers, menu items) use page numbers with `?search=` (debounced 300 ms); purchase orders and orders use cursors: the URL keeps only the opaque token read from `next` / `previous` (`api/client.cursorOf`), and the request is the resource path + current filters + `cursor`. A page-number list whose page returns 404 resets to page 1 (history entry replaced). Stock status comes from `out_of_stock` per ingredient and the summary's `in_stock` / `out_of_stock`. Page, cursor, search and filters live in the URL (`lib/useListParams`), so refresh and back work; searching or changing a filter resets the position. Lists use `keepPreviousData` and dim while the next page loads. Pickers use the unpaginated `/options/` endpoints; stock cards come from `/api/ingredients/summary/`.
- Menu items and add-ons are the same recipe catalog: `features/recipes` takes a `RecipeCatalog` (query key, list, options, create) plus labels, and both pages are a config of it. `MenuItem` / `AddOn` alias `RecipeItem`.
- POS cart (`features/orders`): every line is edited in place (menu item, integer quantity, add-ons with integer quantities); "Add line" / "Add add-on" append, ✕ removes, the last line can't be removed. The request keeps cart order and always sends `add_ons` (an empty list when none). After a recorded order (201 or 200) the cart resets and a new `external_id` is made; after any failure both are kept. The result and the recent orders list render `status` and per line / add-on `status` + `shortages` exactly as returned; the UI never predicts fulfilment. Duplicate add-ons on a line and the per-line limits are left to the API's 400.
- Visual design lives in the shared components (`components/`): sidebar shell with grouped nav (top bar on phones), Inter, slate palette with an orange `brand` accent in `@theme`. Pages only compose components, so restyling never touches feature logic.

## Build order (one commit + push per step)

1. **Scaffold:** Vite, Tailwind, Router, Query client, `api/client.ts` and `types.ts`, shared components, Dockerfile, `/api` proxy.
2. **Ingredients and Suppliers:** list + create.
3. **Menu items:** list with recipes + create with dynamic recipe lines.
4. **Purchase orders:** list (all/open), create with dynamic lines, detail with action buttons and receive form.
5. **POS simulator:** sale form with generated `external_id`, insufficient-stock display, recent sales.
6. **Stock dashboard (home):** on_hand per ingredient, out-of-stock highlighted, freshness indicator.
7. **Supplier ingredients (done):** suppliers declare supplied ingredients (checklist on create, inline "Edit items" via PATCH); PO form offers only the chosen supplier's ingredients.
8. **Add-ons (done):** list with recipes + create form, reusing the menu item recipe editor and list components (no copy-paste). Nav entry next to Menu items.
9. **POS cart (multi-line orders, done):** replace the single-sale form with a cart: add a line (menu item, quantity, add-ons with quantities from `/api/add-ons/options/`), edit or remove lines, submit `POST /api/orders/` with one `external_id` per attempt. The result shows each line and add-on as fulfilled or skipped with its `shortages`, and the order status. Recent orders list (cursor) shows status and lines with their add-ons. `/api/sales/` client code is removed. The UI never predicts fulfilment.

## Key tests (Vitest + Testing Library, fetch mocked)

- `client.ts` maps a 409 body to `ApiError` with code, detail and shortages.
- PO detail renders exactly the buttons in `allowed_actions`.
- Receive form prefills outstanding quantities, skips only empty or zero lines and sends every other value as typed.
- PO create and receive forms reuse `request_id` on a retry after failure and send a new one after success; `idempotency_conflict` detail is shown verbatim.
- POS cart: builds the contract's request shape (line order kept, add-ons per line); renders skipped lines and add-ons with shortages and the `partial` status from a 201; lists shortages on `insufficient_stock`; reuses `external_id` on a retry after failure and renews it after success.
- Add-on create form sends the recipe as typed.

## Run

`make test-fe`, `make audit-fe` (npm audit + lint), or `npm test` / `npm run lint` inside `fudoo-fe/`.
