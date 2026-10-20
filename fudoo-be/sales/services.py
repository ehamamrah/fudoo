from collections import defaultdict
from decimal import Decimal

from django.db import transaction

from core.idempotency import create_once
from inventory import stock
from inventory.errors import InsufficientStock
from inventory.models import StockMovement
from sales.models import Order, OrderLine, OrderLineAddOn, Outcome


def record_order(external_id, lines):
    """Returns (order, created). A repeated external_id with the same lines returns the order as recorded;
    add-on order inside a line does not matter, line order does."""
    return create_once(
        find=lambda: Order.objects.with_lines().filter(external_id=external_id).first(),
        create=lambda: _create_order(external_id, lines),
        matches=lambda order: _recorded_signature(order) == _requested_signature(lines),
    )


@transaction.atomic
def _create_order(external_id, lines):
    """Inserts the order before holding stock, so a concurrent request with the same external_id
    waits on the unique index and replays the winner instead of competing for the stock."""
    order = Order.objects.create(external_id=external_id, status=Order.Status.PARTIAL)
    held = stock.hold(_ingredient_ids(lines))
    plan = [_plan_line(held, line) for line in lines]
    if not any(line.fulfilled for line, _, _ in plan):
        raise InsufficientStock(held.shortages(_summed(needs for _, needs, _ in plan)))
    _save(order, plan)
    held.withdraw(_withdrawals(plan), StockMovement.Reason.SALE)
    return Order.objects.with_lines().get(pk=order.pk)


def _plan_line(held, line):
    needs = _needs(line["menu_item"], line["quantity"])
    order_line = OrderLine(
        menu_item=line["menu_item"], quantity=line["quantity"], **_outcome(held.reserve(needs))
    )
    return order_line, needs, [_plan_add_on(held, choice, order_line) for choice in line["add_ons"]]


def _plan_add_on(held, choice, line):
    needs = _needs(choice["add_on"], choice["quantity"] * line.quantity)
    outcome = _outcome(held.reserve(needs)) if line.fulfilled else _skipped_with_line()
    return OrderLineAddOn(line=line, add_on=choice["add_on"], quantity=choice["quantity"], **outcome), needs


def _outcome(shortages):
    status = Outcome.SKIPPED if shortages else Outcome.FULFILLED
    return {"status": status, "shortages": shortages}


def _skipped_with_line():
    return {"status": Outcome.SKIPPED, "shortages": []}


def _save(order, plan):
    lines = [line for line, _, _ in plan]
    add_ons = [add_on for _, _, choices in plan for add_on, _ in choices]
    for line in lines:
        line.order = order
    OrderLine.objects.bulk_create(lines)
    OrderLineAddOn.objects.bulk_create(add_ons)
    order.status = _status(lines + add_ons)
    order.save(update_fields=["status"])


def _status(parts):
    return Order.Status.COMPLETED if all(part.fulfilled for part in parts) else Order.Status.PARTIAL


def _withdrawals(plan):
    changes = []
    for line, needs, choices in plan:
        changes += [(f"order-line:{line.id}", needs)] if line.fulfilled else []
        changes += [(f"order-add-on:{add_on.id}", add_on_needs) for add_on, add_on_needs in choices if add_on.fulfilled]
    return changes


def _needs(owner, multiplier):
    return {recipe_line.ingredient_id: recipe_line.quantity * multiplier for recipe_line in owner.recipe.all()}


def _summed(all_needs):
    total = defaultdict(Decimal)
    for needs in all_needs:
        for pk, quantity in needs.items():
            total[pk] += quantity
    return total


def _ingredient_ids(lines):
    owners = [line["menu_item"] for line in lines] + [c["add_on"] for line in lines for c in line["add_ons"]]
    return {recipe_line.ingredient_id for owner in owners for recipe_line in owner.recipe.all()}


def _requested_signature(lines):
    return [
        (line["menu_item"].id, line["quantity"], sorted((c["add_on"].id, c["quantity"]) for c in line["add_ons"]))
        for line in lines
    ]


def _recorded_signature(order):
    return [
        (line.menu_item_id, line.quantity, sorted((a.add_on_id, a.quantity) for a in line.add_ons.all()))
        for line in order.lines.all()
    ]
