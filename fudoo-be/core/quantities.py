from decimal import Decimal

from django.db import models
from rest_framework import serializers

MAX_DIGITS = 12
DECIMAL_PLACES = 3
SMALLEST = Decimal("0.001")


class QuantityField(models.DecimalField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_digits", MAX_DIGITS)
        kwargs.setdefault("decimal_places", DECIMAL_PLACES)
        super().__init__(*args, **kwargs)


def positive_quantity():
    return serializers.DecimalField(
        max_digits=MAX_DIGITS, decimal_places=DECIMAL_PLACES, min_value=SMALLEST
    )


def format_quantity(value):
    return f"{value:.{DECIMAL_PLACES}f}"
