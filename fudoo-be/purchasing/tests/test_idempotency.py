from decimal import Decimal

import pytest

from catalog.models import Supplier
from core.idempotency import IdempotencyConflict
from inventory.models import StockMovement
from purchasing.models import Delivery, POLine, PurchaseOrder, Status
from purchasing.services import create_purchase_order, receive_delivery

pytestmark = pytest.mark.django_db


def order_lines(*pairs):
    return [{"ingredient": ingredient, "quantity_ordered": Decimal(q)} for ingredient, q in pairs]


def delivery_lines(*pairs):
    return [{"line": line.id, "quantity": Decimal(q)} for line, q in pairs]


def test_repeated_order_request_returns_original(supplier, beef, bun):
    first, created = create_purchase_order("po-1", supplier, order_lines((beef, "5"), (bun, "2")))
    again, replayed = create_purchase_order("po-1", supplier, order_lines((bun, "2.000"), (beef, "5")))
    assert (created, replayed, again.id) == (True, False, first.id)
    assert (PurchaseOrder.objects.count(), POLine.objects.count()) == (1, 2)


@pytest.mark.parametrize("change", ["supplier", "quantity", "ingredient", "extra_line"])
def test_reused_order_request_with_other_payload_conflicts(supplier, beef, bun, change):
    create_purchase_order("po-1", supplier, order_lines((beef, "5")))
    other_supplier = Supplier.objects.create(name="Other")
    other_supplier.ingredients.add(beef)
    variants = {
        "supplier": (other_supplier, order_lines((beef, "5"))),
        "quantity": (supplier, order_lines((beef, "6"))),
        "ingredient": (supplier, order_lines((bun, "5"))),
        "extra_line": (supplier, order_lines((beef, "5"), (bun, "1"))),
    }
    with pytest.raises(IdempotencyConflict):
        create_purchase_order("po-1", *variants[change])
    assert (PurchaseOrder.objects.count(), POLine.objects.count()) == (1, 1)


def test_repeated_delivery_applies_once(sent_order, lines, beef):
    first, created = receive_delivery(sent_order.id, "d-1", delivery_lines((lines["Beef"], "3000")))
    again, replayed = receive_delivery(sent_order.id, "d-1", delivery_lines((lines["Beef"], "3000")))
    assert (created, replayed, again.id, again.status) == (True, False, first.id, Status.RECEIVED)
    beef.refresh_from_db()
    assert beef.on_hand == Decimal("3000")
    assert (Delivery.objects.count(), StockMovement.objects.count()) == (1, 1)


def test_repeat_of_closing_delivery_returns_closed_order(sent_order, lines):
    full = delivery_lines((lines["Beef"], "5000"), (lines["Bun"], "100"))
    receive_delivery(sent_order.id, "d-1", full)
    order, created = receive_delivery(sent_order.id, "d-1", full)
    assert (order.status, created) == (Status.CLOSED, False)


@pytest.mark.parametrize("change", ["quantity", "line", "extra_line"])
def test_reused_delivery_request_with_other_lines_conflicts(sent_order, lines, change):
    receive_delivery(sent_order.id, "d-1", delivery_lines((lines["Beef"], "10")))
    variants = {
        "quantity": delivery_lines((lines["Beef"], "11")),
        "line": delivery_lines((lines["Bun"], "10")),
        "extra_line": delivery_lines((lines["Beef"], "10"), (lines["Bun"], "1")),
    }
    with pytest.raises(IdempotencyConflict):
        receive_delivery(sent_order.id, "d-1", variants[change])
    assert (Delivery.objects.count(), StockMovement.objects.count()) == (1, 1)


def test_reused_delivery_request_on_other_order_conflicts(sent_order, lines, order_in, supplier, beef):
    receive_delivery(sent_order.id, "d-1", delivery_lines((lines["Beef"], "10")))
    other, _ = create_purchase_order("po-2", supplier, order_lines((beef, "10")))
    order_in(other, Status.SENT)
    with pytest.raises(IdempotencyConflict):
        receive_delivery(other.id, "d-1", delivery_lines((other.lines.get(), "10")))
    assert Delivery.objects.count() == 1
