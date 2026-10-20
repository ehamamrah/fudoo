from decimal import Decimal

import pytest

from conftest import build_add_on, build_burger, order_line
from core.idempotency import IdempotencyConflict
from inventory.errors import InsufficientStock
from inventory.models import StockMovement
from inventory.tests.ledger import assert_ledger_matches
from sales.models import Order, OrderLine, OrderLineAddOn
from sales.services import record_order

pytestmark = pytest.mark.django_db


def levels(*ingredients):
    for ingredient in ingredients:
        ingredient.refresh_from_db()
    return tuple(ingredient.on_hand for ingredient in ingredients)


def outcomes(order):
    return [
        (line.status, [add_on.status for add_on in line.add_ons.all()]) for line in order.lines.all()
    ]


def sale_movements(reference):
    return sorted(m.quantity for m in StockMovement.objects.filter(reason="sale", reference=reference))


def shortage(ingredient, required, available):
    return {"ingredient": ingredient.id, "name": ingredient.name, "required": required, "available": available}


def test_line_deducts_recipe_times_quantity(burger, beef, bun, stock_up):
    stock_up((beef, "1000"), (bun, "10"))
    order, created = record_order("pos-1", [order_line(burger, 3)])
    assert (created, order.status, outcomes(order)) == (True, "completed", [("fulfilled", [])])
    assert levels(beef, bun) == (Decimal("550"), Decimal("7"))
    assert sale_movements(f"order-line:{order.lines.get().id}") == [Decimal("-450"), Decimal("-3")]


def test_add_on_is_used_per_unit_of_the_line(burger, beef, bun, cheddar, extra_cheese, stock_up):
    stock_up((beef, "1000"), (bun, "10"), (cheddar, "10"))
    order, _ = record_order("pos-1", [order_line(burger, 3, (extra_cheese, 2))])
    add_on = order.lines.get().add_ons.get()
    assert (order.status, add_on.status, add_on.shortages) == ("completed", "fulfilled", [])
    assert levels(cheddar) == (Decimal("4"),)
    assert sale_movements(f"order-add-on:{add_on.id}") == [Decimal("-6")]


def test_short_menu_item_skips_its_line_and_add_ons_while_another_line_goes_through(
    burger, beef, bun, cheddar, extra_cheese, stock_up
):
    cup = build_add_on(cheddar, "1", "Cheese cup")
    snack = build_burger(cheddar, bun, "Cheese snack")
    stock_up((beef, "100"), (bun, "5"), (cheddar, "500"))
    order, _ = record_order("pos-1", [order_line(burger, 1, (extra_cheese, 1)), order_line(snack, 1, (cup, 1))])
    skipped, fulfilled = order.lines.all()
    assert (order.status, outcomes(order)) == ("partial", [("skipped", ["skipped"]), ("fulfilled", ["fulfilled"])])
    assert skipped.shortages == [shortage(beef, "150.000", "100.000")]
    assert skipped.add_ons.get().shortages == []
    assert levels(beef, bun, cheddar) == (Decimal("100"), Decimal("4"), Decimal("349"))


def test_short_add_on_is_skipped_and_its_line_stays_fulfilled(burger, beef, bun, cheddar, extra_cheese, stock_up):
    stock_up((beef, "1000"), (bun, "10"), (cheddar, "1"))
    order, _ = record_order("pos-1", [order_line(burger, 2, (extra_cheese, 1))])
    add_on = order.lines.get().add_ons.get()
    assert (order.status, outcomes(order)) == ("partial", [("fulfilled", ["skipped"])])
    assert add_on.shortages == [shortage(cheddar, "2.000", "1.000")]
    assert levels(beef, bun, cheddar) == (Decimal("700"), Decimal("8"), Decimal("1"))
    assert not StockMovement.objects.filter(reference=f"order-add-on:{add_on.id}").exists()


def test_lines_compete_in_request_order_for_the_last_beef(burger, beef, bun, stock_up):
    stock_up((beef, "200"), (bun, "10"))
    order, _ = record_order("pos-1", [order_line(burger, 1), order_line(burger, 1)])
    first, second = order.lines.all()
    assert (first.status, second.status) == ("fulfilled", "skipped")
    assert second.shortages == [shortage(beef, "150.000", "50.000")]
    assert levels(beef, bun) == (Decimal("50"), Decimal("9"))


def test_add_on_checked_after_its_line_and_before_the_next_line(burger, beef, bun, extra_cheese, cheddar, stock_up):
    snack = build_burger(cheddar, bun, "Cheese snack")
    stock_up((beef, "1000"), (bun, "10"), (cheddar, "150"))
    order, _ = record_order("pos-1", [order_line(burger, 1, (extra_cheese, 1)), order_line(snack, 1)])
    assert outcomes(order) == [("fulfilled", ["fulfilled"]), ("skipped", [])]
    assert order.lines.last().shortages == [shortage(cheddar, "150.000", "149.000")]


@pytest.mark.parametrize(("cheese", "status"), [("2", "completed"), ("1", "partial")])
def test_status_is_completed_only_when_everything_is_fulfilled(burger, beef, bun, cheddar, extra_cheese, stock_up, cheese, status):
    stock_up((beef, "1000"), (bun, "10"), (cheddar, cheese))
    order, _ = record_order("pos-1", [order_line(burger, 2, (extra_cheese, 1))])
    assert Order.objects.get(pk=order.pk).status == status


def test_every_line_short_records_nothing_and_reports_summed_shortages(burger, beef, bun, cheddar, extra_cheese, stock_up):
    stock_up((beef, "100"), (bun, "5"), (cheddar, "10"))
    with pytest.raises(InsufficientStock) as error:
        record_order("pos-1", [order_line(burger, 1, (extra_cheese, 1)), order_line(burger, 2)])
    assert error.value.extra["shortages"] == [shortage(beef, "450.000", "100.000")]
    assert (Order.objects.count(), OrderLine.objects.count(), OrderLineAddOn.objects.count()) == (0, 0, 0)
    assert not StockMovement.objects.filter(reason="sale").exists()
    assert levels(beef, bun, cheddar) == (Decimal("100"), Decimal("5"), Decimal("10"))


def test_rejected_order_can_be_retried_after_restock(burger, beef, bun, stock_up):
    with pytest.raises(InsufficientStock):
        record_order("pos-1", [order_line(burger)])
    stock_up((beef, "150"), (bun, "1"))
    assert record_order("pos-1", [order_line(burger)])[1]
    assert levels(beef, bun) == (0, 0)


def test_retry_returns_the_original_outcome_after_stock_changed(burger, beef, bun, cheddar, extra_cheese, stock_up):
    stock_up((beef, "1000"), (bun, "10"))
    first, _ = record_order("pos-1", [order_line(burger, 1, (extra_cheese, 1))])
    stock_up((cheddar, "100"))
    again, created = record_order("pos-1", [order_line(burger, 1, (extra_cheese, 1))])
    assert (again.id, created, again.status, outcomes(again)) == (first.id, False, "partial", [("fulfilled", ["skipped"])])
    assert levels(beef, cheddar) == (Decimal("850"), Decimal("100"))


@pytest.fixture
def recorded(burger, beef, bun, cheddar, extra_cheese, stock_up):
    stock_up((beef, "10000"), (bun, "100"), (cheddar, "100"))
    sides = build_add_on(bun, "1", "Extra bun")
    record_order("pos-1", [order_line(burger, 1, (extra_cheese, 1), (sides, 2)), order_line(burger, 2)])
    return sides


@pytest.mark.parametrize("change", [
    lambda b, c, s: [order_line(b, 2), order_line(b, 1, (c, 1), (s, 2))],
    lambda b, c, s: [order_line(b, 1, (c, 1), (s, 2)), order_line(b, 3)],
    lambda b, c, s: [order_line(b, 1, (c, 1), (s, 1)), order_line(b, 2)],
    lambda b, c, s: [order_line(b, 1, (c, 1)), order_line(b, 2)],
    lambda b, c, s: [order_line(b, 1, (c, 1), (s, 2)), order_line(b, 2, (c, 1))],
    lambda b, c, s: [order_line(b, 1, (c, 1), (s, 2))],
    lambda b, c, s: [order_line(b, 1, (c, 1), (s, 2)), order_line(b, 2), order_line(b, 1)],
])
def test_same_id_with_different_lines_conflicts(burger, extra_cheese, recorded, change):
    with pytest.raises(IdempotencyConflict):
        record_order("pos-1", change(burger, extra_cheese, recorded))
    assert (Order.objects.count(), OrderLine.objects.count()) == (1, 2)


def test_same_id_with_another_menu_item_conflicts(burger, beef, bun, extra_cheese, recorded):
    double = build_burger(beef, bun, "Double")
    with pytest.raises(IdempotencyConflict):
        record_order("pos-1", [order_line(double, 1, (extra_cheese, 1), (recorded, 2)), order_line(burger, 2)])


def test_reordered_add_ons_inside_a_line_are_the_same_request(burger, extra_cheese, recorded):
    lines = [order_line(burger, 1, (recorded, 2), (extra_cheese, 1)), order_line(burger, 2)]
    order, created = record_order("pos-1", lines)
    assert (created, Order.objects.count(), StockMovement.objects.filter(reason="sale").count()) == (False, 1, 6)


def test_on_hand_equals_sum_of_movements_after_mixed_operations(burger, beef, bun, cheddar, extra_cheese, stock_up):
    stock_up((beef, "400"), (bun, "3"), (cheddar, "1"))
    record_order("pos-1", [order_line(burger, 1, (extra_cheese, 1)), order_line(burger, 2, (extra_cheese, 1))])
    with pytest.raises(InsufficientStock):
        record_order("pos-2", [order_line(burger, 2)])
    stock_up((beef, "150.5"), (cheddar, "3"))
    record_order("pos-3", [order_line(burger, 1, (extra_cheese, 3)), order_line(burger, 1)])
    assert_ledger_matches(beef, bun, cheddar)
    assert levels(beef, bun, cheddar) == (Decimal("100.5"), Decimal("0"), Decimal("0"))
