from django.db import models

from catalog.models import MenuItem


class Sale(models.Model):
    external_id = models.CharField(max_length=100, unique=True)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT, related_name="+")
    quantity = models.PositiveIntegerField()
    sold_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sold_at", "-id"]
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gt=0), name="sale_quantity_positive"),
        ]
