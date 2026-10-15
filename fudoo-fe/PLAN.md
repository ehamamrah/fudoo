# fudoo-fe — Implementation Plan

Vite + React 18 + TypeScript (strict) + Tailwind + TanStack Query + React Router. Contract: `../docs/api-contract.md`. Rules: `../AGENTS.md`.

## Structure

```
src/
  api/         client.ts (fetch wrapper → typed ApiError), types.ts (mirrors contract), one file per resource
  components/  Button, Field, Table, ErrorBanner, Badge, Page, FormPanel, QueryState, UpdatedAgo
  lib/         display formatting, shared hooks
  features/    stock, ingredients, suppliers, menu-items, purchase-orders, sales — each: hooks.ts + page(s)
  App.tsx      router + nav
```

- Pages call feature hooks only; hooks wrap TanStack Query.
- Mutations invalidate affected queries. Stock and open POs poll every 5 s and show "Updated Xs ago".
- No business rules in the UI: PO buttons come from `allowed_actions`, outstanding quantities from the API, errors from `detail` / `shortages`.

## Decisions taken during the build

- Tailwind v3 with PostCSS. Status: all seven steps done.
- PO receive form is shown from the API's `can_receive` flag; action buttons from `allowed_actions`. The UI holds no state-machine knowledge.
- Stock shows Out of stock / In stock only. A "low" threshold needs a backend `reorder_level`; deferred (YAGNI).
- Supplier ingredient filtering in the PO form is display-only, driven by `Supplier.ingredients` from the API. The backend enforces the rule (`409 ingredient_not_supplied`) and the form shows its `detail` verbatim. Changing the supplier resets the lines.
- POS keeps one `external_id` per attempt and regenerates it only after a successful sale, so a resubmit after a network failure stays idempotent.

## Build order (one commit + push per step)

1. **Scaffold:** Vite, Tailwind, Router, Query client, `api/client.ts` and `types.ts`, shared components, Dockerfile, `/api` proxy.
2. **Ingredients and Suppliers:** list + create.
3. **Menu items:** list with recipes + create with dynamic recipe lines.
4. **Purchase orders:** list (all/open), create with dynamic lines, detail with action buttons and receive form.
5. **POS simulator:** sale form with generated `external_id`, insufficient-stock display, recent sales.
6. **Stock dashboard (home):** on_hand per ingredient, out-of-stock highlighted, freshness indicator.
7. **Supplier ingredients (done):** suppliers declare supplied ingredients (checklist on create, inline "Edit items" via PATCH); PO form offers only the chosen supplier's ingredients.

## Key tests (Vitest + Testing Library, fetch mocked)

- `client.ts` maps a 409 body to `ApiError` with code, detail and shortages.
- PO detail renders exactly the buttons in `allowed_actions`.
- Receive form prefills outstanding quantities, skips only empty or zero lines and sends every other value as typed.
- POS form lists shortages on `insufficient_stock`.

## Run

`make test-fe`, or `npm test` inside `fudoo-fe/`.
