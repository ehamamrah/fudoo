# fudoo-fe — Implementation Plan

Vite + React 18 + TypeScript (strict) + Tailwind + TanStack Query + React Router. Contract: `../docs/api-contract.md`. Rules: `../AGENTS.md`.

## Structure

```
src/
  api/         client.ts (fetch wrapper → typed ApiError), types.ts (mirrors contract), one file per resource
  components/  Button, Field, Table, ErrorBanner, Badge, Page
  features/    stock, ingredients, suppliers, menu-items, purchase-orders, sales — each: hooks.ts + page(s)
  App.tsx      router + nav
```

- Pages call feature hooks only; hooks wrap TanStack Query.
- Mutations invalidate affected queries. Stock and open POs poll every 5 s and show "Updated Xs ago".
- No business rules in the UI: PO buttons come from `allowed_actions`, outstanding quantities from the API, errors from `detail` / `shortages`.

## Build order (one commit + push per step)

1. **Scaffold:** Vite, Tailwind, Router, Query client, `api/client.ts` and `types.ts`, shared components, Dockerfile, `/api` proxy.
2. **Ingredients and Suppliers:** list + create.
3. **Menu items:** list with recipes + create with dynamic recipe lines.
4. **Purchase orders:** list (all/open), create with dynamic lines, detail with action buttons and receive form.
5. **POS simulator:** sale form with generated `external_id`, insufficient-stock display, recent sales.
6. **Stock dashboard (home):** on_hand per ingredient, zero/low highlighted, freshness indicator.

## Key tests (Vitest + Testing Library, fetch mocked)

- `client.ts` maps a 409 body to `ApiError` with code, detail and shortages.
- PO detail renders exactly the buttons in `allowed_actions`.
- Receive form prefills outstanding quantities and posts only lines > 0.
- POS form lists shortages on `insufficient_stock`.

## Run

`make test-fe`, or `npm test` inside `fudoo-fe/`.
