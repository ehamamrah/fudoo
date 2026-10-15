from decimal import Decimal

import pytest

from core.testing import RACE_ROUNDS, new_id, outcome_kinds, race
from inventory.tests.ledger import assert_ledger_matches
from purchasing.errors import InvalidTransition, PONotReceivable
from purchasing.models import Delivery, PurchaseOrder, Status
from purchasing.services import create_purchase_order, perform_action, receive_delivery
from sales.services import record_sale

pytestmark = pytest.mark.django_db(transaction=True)


def sent_order(supplier, *pairs):
    supplier.ingredients.add(*(ingredient for ingredient, _ in pairs))
    lines = [{"ingredient": ingredient, "quantity_ordered": Decimal(q)} for ingredient, q in pairs]
    order, _ = create_purchase_order(new_id(), supplier, lines)
    perform_action(order.id, "send")
    return order, list(order.lines.all())


def deliver(order, line, quantity, request_id=None):
    lines = [{"line": line.id, "quantity": Decimal(quantity)}]
    return lambda: receive_delivery(order.id, request_id or new_id(), lines)


def test_concurrent_full_deliveries_of_same_line(supplier, fresh_burger):
    for round_ in range(RACE_ROUNDS):
        _, beef, bun = fresh_burger(round_)
        order, (beef_line, _) = sent_order(supplier, (beef, "100"), (bun, "10"))
        outcomes = race(deliver(order, beef_line, "100"), deliver(order, beef_line, "100"))
        assert outcome_kinds(outcomes) == ["OverReceipt", "tuple"]
        beef_line.refresh_from_db()
        assert beef_line.quantity_received == beef_line.quantity_ordered
        assert_ledger_matches(beef)
        assert beef.on_hand == Decimal("100")


def test_cancel_racing_delivery_never_cancels_with_stock_added(supplier, fresh_burger):
    for round_ in range(RACE_ROUNDS):
        _, beef, _ = fresh_burger(round_)
        order, (line,) = sent_order(supplier, (beef, "100"))
        cancelled, delivered = race(lambda: perform_action(order.id, "cancel"), deliver(order, line, "40"))
        order.refresh_from_db()
        assert_ledger_matches(beef)
        assert_single_winner(order, cancelled, delivered, beef)


def assert_single_winner(order, cancelled, delivered, beef):
    if order.status == Status.CANCELLED:
        assert isinstance(delivered, PONotReceivable)
        assert beef.on_hand == 0
    else:
        assert order.status == Status.RECEIVED
        assert isinstance(cancelled, InvalidTransition)
        assert beef.on_hand == Decimal("40")


def test_delivery_racing_sale_keeps_ledger_consistent(supplier, fresh_burger, stock_up):
    for round_ in range(RACE_ROUNDS):
        burger, beef, bun = fresh_burger(round_)
        stock_up((beef, "150"), (bun, "1"))
        order, (line,) = sent_order(supplier, (beef, "500"))
        outcomes = race(lambda: record_sale(f"sale-{round_}", burger, 1), deliver(order, line, "500"))
        assert outcome_kinds(outcomes) == ["tuple", "tuple"]
        assert_ledger_matches(beef, bun)
        assert (beef.on_hand, bun.on_hand) == (Decimal("500"), 0)


def test_same_order_request_racing_creates_one_order(supplier, fresh_burger):
    for round_ in range(RACE_ROUNDS):
        _, beef, _ = fresh_burger(round_)
        supplier.ingredients.add(beef)
        lines = [{"ingredient": beef, "quantity_ordered": Decimal("10")}]
        create = lambda: create_purchase_order(f"po-race-{round_}", supplier, lines)
        outcomes = race(create, create)
        assert outcome_kinds(outcomes) == ["tuple", "tuple"]
        assert sorted(created for _, created in outcomes) == [False, True]
        assert len({order.id for order, _ in outcomes}) == 1
        assert PurchaseOrder.objects.filter(request_id=f"po-race-{round_}").count() == 1


def test_same_delivery_request_racing_applies_once(supplier, fresh_burger):
    for round_ in range(RACE_ROUNDS):
        _, beef, _ = fresh_burger(round_)
        order, (line,) = sent_order(supplier, (beef, "100"))
        receive = deliver(order, line, "100", request_id=f"d-race-{round_}")
        outcomes = race(receive, receive)
        assert outcome_kinds(outcomes) == ["tuple", "tuple"]
        assert sorted(created for _, created in outcomes) == [False, True]
        assert Delivery.objects.filter(purchase_order=order).count() == 1
        assert_ledger_matches(beef)
        assert beef.on_hand == Decimal("100")


def test_same_delivery_request_racing_on_two_orders_applies_once(supplier, fresh_burger):
    for round_ in range(RACE_ROUNDS):
        _, beef, bun = fresh_burger(round_)
        first, (beef_line,) = sent_order(supplier, (beef, "100"))
        second, (bun_line,) = sent_order(supplier, (bun, "10"))
        request_id = f"d-cross-{round_}"
        outcomes = race(deliver(first, beef_line, "100", request_id), deliver(second, bun_line, "10", request_id))
        assert outcome_kinds(outcomes) == ["IdempotencyConflict", "tuple"]
        assert Delivery.objects.filter(request_id=request_id).count() == 1
        assert_ledger_matches(beef, bun)
        assert beef.on_hand + bun.on_hand in (Decimal("100"), Decimal("10"))
