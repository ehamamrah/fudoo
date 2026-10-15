from django.db import transaction
from django.shortcuts import get_object_or_404

from inventory import stock
from inventory.models import StockMovement
from purchasing import state_machine
from purchasing.errors import IngredientNotSupplied, OverReceipt, PONotReceivable
from purchasing.models import Delivery, DeliveryLine, POLine, PurchaseOrder


@transaction.atomic
def create_purchase_order(supplier, lines):
    _reject_unsupplied(supplier, [line["ingredient"] for line in lines])
    order = PurchaseOrder.objects.create(supplier=supplier)
    POLine.objects.bulk_create(POLine(purchase_order=order, **line) for line in lines)
    return order


@transaction.atomic
def perform_action(order_id, action):
    order = _lock(order_id)
    state_machine.perform(order, action)
    return order


@transaction.atomic
def receive_delivery(order_id, lines):
    order = _lock(order_id)
    if not state_machine.can_receive(order.status):
        raise PONotReceivable(order.status)
    po_lines = {line.id: line for line in order.lines.select_related("ingredient")}
    received = {po_lines[item["line"]]: item["quantity"] for item in lines}
    _reject_over_receipt(received)
    delivery = _record_delivery(order, received)
    _increase_stock(received, delivery)
    state_machine.record_delivery(order, _fully_received(po_lines.values()))
    return order


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


def _record_delivery(order, received):
    delivery = Delivery.objects.create(purchase_order=order)
    DeliveryLine.objects.bulk_create(
        DeliveryLine(delivery=delivery, po_line=line, quantity=quantity)
        for line, quantity in received.items()
    )
    for line, quantity in received.items():
        line.quantity_received += quantity
        line.save(update_fields=["quantity_received"])
    return delivery


def _increase_stock(received, delivery):
    quantities = {line.ingredient_id: quantity for line, quantity in received.items()}
    stock.increase(quantities, StockMovement.Reason.DELIVERY, f"delivery:{delivery.id}")


def _fully_received(lines):
    return all(line.quantity_outstanding == 0 for line in lines)
