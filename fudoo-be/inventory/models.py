from django.db import models

from catalog.models import Ingredient
from core.quantities import QuantityField


class StockMovement(models.Model):
    class Reason(models.TextChoices):
        DELIVERY = "delivery"
        SALE = "sale"

    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT, related_name="movements")
    quantity = QuantityField()
    reason = models.CharField(max_length=16, choices=Reason.choices)
    reference = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(quantity=0), name="stock_movement_quantity_non_zero"
            ),
        ]
