from django.db import models
from django.db.models import Prefetch
from django.utils import timezone

from catalog.models import AddOn, MenuItem
from core.idempotency import ID_MAX_LENGTH


class OrderQuerySet(models.QuerySet):
    def with_lines(self):
        add_ons = OrderLineAddOn.objects.select_related("add_on")
        lines = OrderLine.objects.select_related("menu_item").prefetch_related(
            Prefetch("add_ons", queryset=add_ons)
        )
        return self.prefetch_related(Prefetch("lines", queryset=lines))


class Order(models.Model):
    class Status(models.TextChoices):
        COMPLETED = "completed"
        PARTIAL = "partial"

    external_id = models.CharField(max_length=ID_MAX_LENGTH, unique=True)
    status = models.CharField(max_length=16, choices=Status.choices)
    ordered_at = models.DateTimeField(default=timezone.now)

    objects = OrderQuerySet.as_manager()

    class Meta:
        ordering = ["-ordered_at", "-id"]
        indexes = [models.Index(fields=["-ordered_at", "-id"], name="order_newest")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status__in=["completed", "partial"]), name="order_status_valid"
            ),
        ]


class Outcome(models.TextChoices):
    FULFILLED = "fulfilled"
    SKIPPED = "skipped"


class OrderPart(models.Model):
    quantity = models.PositiveIntegerField()
    status = models.CharField(max_length=16, choices=Outcome.choices)
    shortages = models.JSONField(default=list)

    class Meta:
        abstract = True
        ordering = ["id"]

    @property
    def fulfilled(self):
        return self.status == Outcome.FULFILLED


class OrderLine(OrderPart):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT, related_name="+")

    class Meta(OrderPart.Meta):
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0), name="order_line_quantity_positive"
            ),
        ]


class OrderLineAddOn(OrderPart):
    line = models.ForeignKey(OrderLine, on_delete=models.CASCADE, related_name="add_ons")
    add_on = models.ForeignKey(AddOn, on_delete=models.PROTECT, related_name="+")

    class Meta(OrderPart.Meta):
        constraints = [
            models.UniqueConstraint(fields=["line", "add_on"], name="order_line_add_on_unique"),
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0), name="order_line_add_on_quantity_positive"
            ),
        ]
