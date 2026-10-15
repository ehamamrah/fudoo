from decimal import Decimal

import pytest
from django.db import IntegrityError, transaction

from inventory.models import StockMovement
from purchasing.errors import OverReceipt, PONotReceivable
from purchasing.models import Delivery, POLine, Status
from purchasing.services import receive_delivery

pytestmark = pytest.mark.django_db


def receive(order, *items):
    return receive_delivery(order.id, [{"line": line.id, "quantity": Decimal(q)} for line, q in items])


def reload(*objects):
    for obj in objects:
        obj.refresh_from_db()


def test_partial_then_full_delivery_closes_order(sent_order, lines, beef, bun):
    beef_line, bun_line = lines["Beef"], lines["Bun"]
    assert receive(sent_order, (beef_line, "3000")).status == Status.RECEIVED
    assert receive(sent_order, (beef_line, "2000"), (bun_line, "100")).status == Status.CLOSED
    reload(beef_line, bun_line, beef, bun)
    assert (beef_line.quantity_received, bun_line.quantity_received) == (Decimal("5000"), Decimal("100"))
    assert (beef.on_hand, bun.on_hand) == (Decimal("5000"), Decimal("100"))
    assert Delivery.objects.count() == 2


def test_full_delivery_from_sent_closes_order(sent_order, lines):
    order = receive(sent_order, (lines["Beef"], "5000"), (lines["Bun"], "100"))
    assert order.status == Status.CLOSED


def test_repeated_partial_delivery_stays_received(sent_order, lines):
    receive(sent_order, (lines["Beef"], "1000"))
    assert receive(sent_order, (lines["Beef"], "1000")).status == Status.RECEIVED


def test_delivery_writes_stock_movements(sent_order, lines, beef):
    receive(sent_order, (lines["Beef"], "1234.5"))
    movement = StockMovement.objects.get()
    assert (movement.ingredient_id, movement.quantity, movement.reason) == (beef.id, Decimal("1234.5"), "delivery")


def test_over_receipt_rejected_with_nothing_applied(sent_order, lines, beef, bun):
    receive(sent_order, (lines["Beef"], "4000"))
    with pytest.raises(OverReceipt):
        receive(sent_order, (lines["Bun"], "10"), (lines["Beef"], "1000.001"))
    reload(sent_order, beef, bun, lines["Beef"], lines["Bun"])
    assert (beef.on_hand, bun.on_hand) == (Decimal("4000"), 0)
    assert lines["Bun"].quantity_received == 0
    assert (Delivery.objects.count(), StockMovement.objects.count()) == (1, 1)
    assert sent_order.status == Status.RECEIVED


@pytest.mark.parametrize("status", [Status.DRAFT, Status.CLOSED, Status.CANCELLED])
def test_delivery_on_non_receivable_order_rejected(order, order_in, lines, status):
    order_in(order, status)
    before = (Delivery.objects.count(), StockMovement.objects.count())
    with pytest.raises(PONotReceivable):
        receive(order, (lines["Beef"], "1"))
    assert (Delivery.objects.count(), StockMovement.objects.count()) == before


def test_database_rejects_received_above_ordered(lines):
    with pytest.raises(IntegrityError), transaction.atomic():
        POLine.objects.filter(pk=lines["Bun"].pk).update(quantity_received=Decimal("101"))
