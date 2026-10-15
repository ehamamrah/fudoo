from django.db import transaction
from django.shortcuts import get_object_or_404

from core.idempotency import create_once
from inventory import stock
from inventory.models import StockMovement
from purchasing import state_machine
from purchasing.errors import IngredientNotSupplied, OverReceipt, PONotReceivable
from purchasing.models import Delivery, DeliveryLine, POLine, PurchaseOrder


def create_purchase_order(request_id, supplier, lines):
    """Returns (order, created). A repeated request_id with the same supplier and lines returns the original."""
    return create_once(
        find=lambda: PurchaseOrder.objects.filter(request_id=request_id).first(),
        create=lambda: _create_order(request_id, supplier, lines),
        matches=lambda order: _same_order(order, supplier, lines),
    )


@transaction.atomic
def perform_action(order_id, action):
    order = _lock(order_id)
    state_machine.perform(order, action)
    return order


@transaction.atomic
def receive_delivery(order_id, request_id, lines):
    """Returns (order, created). The duplicate lookup runs under the order lock, so a retry that waited
    for the first attempt sees its delivery instead of re-checking outstanding quantities."""
    order = _lock(order_id)
    _, created = create_once(
        find=lambda: Delivery.objects.filter(request_id=request_id).first(),
        create=lambda: _apply_delivery(order, request_id, lines),
        matches=lambda delivery: _same_delivery(delivery, order, lines),
    )
    return order, created


@transaction.atomic
def _create_order(request_id, supplier, lines):
    _reject_unsupplied(supplier, [line["ingredient"] for line in lines])
    order = PurchaseOrder.objects.create(request_id=request_id, supplier=supplier)
    POLine.objects.bulk_create(POLine(purchase_order=order, **line) for line in lines)
    return order


def _same_order(order, supplier, lines):
    ordered = {line.ingredient_id: line.quantity_ordered for line in order.lines.all()}
    requested = {line["ingredient"].id: line["quantity_ordered"] for line in lines}
    return order.supplier_id == supplier.id and ordered == requested


@transaction.atomic
def _apply_delivery(order, request_id, lines):
    if not state_machine.can_receive(order.status):
        raise PONotReceivable(order.status)
    po_lines = {line.id: line for line in order.lines.select_related("ingredient")}
    received = {po_lines[item["line"]]: item["quantity"] for item in lines}
    _reject_over_receipt(received)
    delivery = _record_delivery(order, request_id, received)
    _increase_stock(received, delivery)
    state_machine.record_delivery(order, _fully_received(po_lines.values()))
    return delivery


def _same_delivery(delivery, order, lines):
    delivered = {line.po_line_id: line.quantity for line in delivery.lines.all()}
    requested = {item["line"]: item["quantity"] for item in lines}
    return delivery.purchase_order_id == order.id and delivered == requested


def _reject_unsupplied(supplier, ingredients):
    supplied = set(supplier.ingredients.values_list("id", flat=True))
    unsupplied = [ingredient for ingredient in ingredients if ingredient.id not in supplied]
    if unsupplied:
        raise IngredientNotSupplied(supplier, unsupplied)


def _lock(order_id):
    return get_object_or_404(PurchaseOrder.objects.select_for_update(), pk=order_id)


def _reject_over_receipt(received):
    for line, quantity in received.items():
        if quantity > line.quantity_outstanding:
            raise OverReceipt(line, quantity)


def _record_delivery(order, request_id, received):
    delivery = Delivery.objects.create(purchase_order=order, request_id=request_id)
    DeliveryLine.objects.bulk_create(
        DeliveryLine(delivery=delivery, po_line=line, quantity=quantity)
        for line, quantity in received.items()
    )
    for line, quantity in received.items():
        line.quantity_received += quantity
    POLine.objects.bulk_update(received, ["quantity_received"])
    return delivery


def _increase_stock(received, delivery):
    quantities = {line.ingredient_id: quantity for line, quantity in received.items()}
    stock.increase(quantities, StockMovement.Reason.DELIVERY, f"delivery:{delivery.id}")


def _fully_received(lines):
    return all(line.quantity_outstanding == 0 for line in lines)
