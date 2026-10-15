from django.db import models

from catalog.models import MenuItem
from core.idempotency import ID_MAX_LENGTH


class Sale(models.Model):
    external_id = models.CharField(max_length=ID_MAX_LENGTH, unique=True)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT, related_name="+")
    quantity = models.PositiveIntegerField()
    sold_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sold_at", "-id"]
        indexes = [models.Index(fields=["-sold_at", "-id"], name="sale_newest")]
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gt=0), name="sale_quantity_positive"),
        ]
