# Fudoo — Product Plan

From a one-branch prototype to a product for many restaurants. Squad: 3 engineers in 2 workstreams (Backend: E1, E2 · Frontend: E3) and 1 PM.

## 1. Breakdown

| Epic | Scope |
|---|---|
| **E1 Tenancy** | Restaurant (tenant) → branches. Stock, POs and sales belong to a branch from day one; catalog and suppliers to the restaurant. Users, roles (owner, manager) |
| **E2 Catalog** | Ingredients, units and conversions (kg ↔ g, case of 24), suppliers, recipes |
| **E3 Purchasing** | PO lifecycle, partial receiving, short-close, supplier catalog (who supplies what, price, pack size) |
| **E4 POS integration** | One POS vendor via webhook, menu-item mapping, idempotent ingestion, failed-event queue |
| **E5 Stock truth** | Ledger, stock counts and variance, waste, low-stock alerts |

Sample stories, ready to pick up:

- **E4-1 Ingest POS sale webhook.** *As an owner, I want sales from my POS to reduce stock automatically.* AC: signed webhook verified; `(branch, pos_event_id)` unique so retries never deduct twice; unmapped menu item → event parked in a "needs mapping" queue, not dropped; p95 < 300 ms. Tests: replay the same event 3×, out-of-order events, unknown item.
- **E5-1 Stock count.** *As a manager, I want to enter what I physically counted so the system matches the shelf.* AC: count per ingredient creates an `adjustment` movement for the difference; variance report by ingredient and value; counts are immutable once submitted.
- **E4-2 Multi-line orders with add-ons.** *As an owner, I want a whole customer order (2 burgers + extra cheese + cola) to reduce stock in one go, and still go through when one item is out.* AC: one order with many lines and per-line add-ons; each line's item is all-or-nothing, each add-on on its own; a short item skips its line, a short add-on is dropped and the burger is still served; nothing is recorded if no line fits; the result says what was skipped and why; idempotent on `external_id`. Tests: competing lines for the last beef, short add-on, every line short, retry after stock changed. Status: in build (Oct 2026).
- **E3-4 Short-close a PO.** *As a manager, I want to close an order the supplier will never complete.* AC: only from `received`; reason required; outstanding quantity shown as "not delivered" on the supplier report.

## 2. First release

**In:** tenancy (single role: manager), catalog without unit conversions, purchasing, one POS integration, stock counts, low-stock alert by email.
**Cut:** multi-branch features (branch switcher, stock transfers, cross-branch reports), multi-POS, supplier portal, auto-reorder, cost/margin reporting, mobile app. They are valuable, but none of them makes the stock number more trustworthy, and trust is the whole product. The data model is branch-scoped from day one, so adding multi-branch later is a feature, not a migration. The v1 UI assumes one branch per restaurant.

**Committed date: Thursday 10 December 2026** (8 weeks from Monday 19 Oct), as a pilot with 3 restaurants. It depends on: POS vendor sandbox access by end of week 2; pilot restaurants giving us recipes and a full opening stock count; no change of POS vendor during the pilot. If the POS sandbox slips, the date slips with it. I'd rather say that now than cut testing later.

## 3. Risks

| Type | Risk | What we do |
|---|---|---|
| Technical | Lost or duplicated POS events make stock drift silently | Idempotency key, an inbox table with retries, nightly reconciliation against the POS sales report |
| Technical | Concurrent sales and deliveries corrupt stock | Ledger plus row locks plus DB check constraints; concurrency tests in CI |
| Delivery | POS vendor API is slow to get or poorly documented | Spike in week 1; build against a recorded fake so we're not blocked |
| Product | Recipes in the system ≠ what the kitchen actually does (portions, waste) | Stock counts from day one; variance per ingredient shows where recipes are wrong |
| Product | Staff stop recording deliveries, so the numbers go stale | Receiving takes under 30 s on a phone, prefilled from the PO |

## 4. How the squad works

- **Two workstreams:** Backend (E1 owns purchasing and stock, E2 owns POS ingestion and tenancy) and Frontend (E3 owns the whole manager UI). Within a stream, each engineer owns their modules end to end, including tests and on-call. The two backend engineers review each other, so stock code always gets a second pair of eyes.
- **Contract first:** API changes start as a contract PR that the consumer approves before any code.
- **AI tools:** everyone uses Claude Code with a shared `AGENTS.md` (conventions, invariants, the "never do" list) and shared subagents for review and test generation. The author must be able to explain every line. "The AI wrote it" is not an answer in review.
- **Quality bar:** one reviewer on every PR, two for anything that touches stock or money. CI runs tests, types, lint and migration checks.
- **Never let through:** a stock change outside the inventory service; a stock-affecting change without tests; a non-idempotent external endpoint; a migration without a rollback plan; code the author can't explain.

## 5. Knowing it works

1. **Count variance:** median absolute difference between system stock and physical count per ingredient. Target under 5% by week 4 of the pilot. This is the trust metric.
2. **Manual adjustments per week:** if managers keep overriding the numbers, they don't trust them.
3. **Weekly active managers recording deliveries:** at least 80% of POs received in the system within 24 h of arrival. Without that, stock goes stale and trust drops.
