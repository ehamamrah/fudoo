from decimal import Decimal

import pytest

from core.testing import RACE_ROUNDS, outcome_kinds, race
from inventory.testing import assert_ledger_matches
from purchasing.errors import InvalidTransition, PONotReceivable
from purchasing.models import Status
from purchasing.services import create_purchase_order, perform_action, receive_delivery
from sales.services import record_sale

pytestmark = pytest.mark.django_db(transaction=True)


def sent_order(supplier, *pairs):
    supplier.ingredients.add(*(ingredient for ingredient, _ in pairs))
    lines = [{"ingredient": ingredient, "quantity_ordered": Decimal(q)} for ingredient, q in pairs]
    order = create_purchase_order(supplier, lines)
    perform_action(order.id, "send")
    return order, list(order.lines.all())


def deliver(order, line, quantity):
    return lambda: receive_delivery(order.id, [{"line": line.id, "quantity": Decimal(quantity)}])


def test_concurrent_full_deliveries_of_same_line(supplier, fresh_burger):
    for round_ in range(RACE_ROUNDS):
        _, beef, bun = fresh_burger(round_)
        order, (beef_line, _) = sent_order(supplier, (beef, "100"), (bun, "10"))
        outcomes = race(deliver(order, beef_line, "100"), deliver(order, beef_line, "100"))
        assert outcome_kinds(outcomes) == ["OverReceipt", "PurchaseOrder"]
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
        assert outcome_kinds(outcomes) == ["PurchaseOrder", "tuple"]
        assert_ledger_matches(beef, bun)
        assert (beef.on_hand, bun.on_hand) == (Decimal("500"), 0)
