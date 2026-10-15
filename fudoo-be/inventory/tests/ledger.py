from decimal import Decimal

from django.db.models import Sum

from inventory.models import StockMovement


def ledger_total(ingredient):
    total = StockMovement.objects.filter(ingredient=ingredient).aggregate(total=Sum("quantity"))["total"]
    return total or Decimal("0")


def assert_ledger_matches(*ingredients):
    for ingredient in ingredients:
        ingredient.refresh_from_db()
        assert ingredient.on_hand == ledger_total(ingredient)
