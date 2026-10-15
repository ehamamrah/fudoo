from django.db import models

from catalog.models import Ingredient, Supplier
from core.quantities import QuantityField


class Status(models.TextChoices):
    DRAFT = "draft"
    SENT = "sent"
    RECEIVED = "received"
    CLOSED = "closed"
    CANCELLED = "cancelled"


OPEN_STATUSES = (Status.SENT, Status.RECEIVED)


class PurchaseOrder(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="+")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status__in=Status.values), name="purchase_order_status_valid"
            ),
        ]


class POLine(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="lines")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT, related_name="+")
    quantity_ordered = QuantityField()
    quantity_received = QuantityField(default=0)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["purchase_order", "ingredient"], name="po_line_ingredient_unique"
            ),
            models.CheckConstraint(
                condition=models.Q(quantity_ordered__gt=0), name="po_line_ordered_positive"
            ),
            models.CheckConstraint(
                condition=models.Q(
                    quantity_received__gte=0, quantity_received__lte=models.F("quantity_ordered")
                ),
                name="po_line_received_within_ordered",
            ),
        ]

    @property
    def quantity_outstanding(self):
        return self.quantity_ordered - self.quantity_received


class Delivery(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.PROTECT, related_name="deliveries"
    )
    received_at = models.DateTimeField(auto_now_add=True)


class DeliveryLine(models.Model):
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name="lines")
    po_line = models.ForeignKey(POLine, on_delete=models.PROTECT, related_name="+")
    quantity = QuantityField()

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0), name="delivery_line_quantity_positive"
            ),
        ]
