from decimal import Decimal

import pytest
from django.db import IntegrityError, transaction
from django.db.models import Sum

from catalog.models import Ingredient
from inventory import stock
from inventory.errors import InsufficientStock
from inventory.models import StockMovement

pytestmark = pytest.mark.django_db
DELIVERY = StockMovement.Reason.DELIVERY
SALE = StockMovement.Reason.SALE


def on_hand(ingredient):
    ingredient.refresh_from_db()
    return ingredient.on_hand


def ledger_total(ingredient):
    return StockMovement.objects.filter(ingredient=ingredient).aggregate(t=Sum("quantity"))["t"]


def test_increase_updates_on_hand_and_writes_movement(beef):
    stock.increase({beef.id: Decimal("500")}, DELIVERY, "delivery:1")
    assert on_hand(beef) == Decimal("500")
    movement = StockMovement.objects.get()
    assert (movement.quantity, movement.reason, movement.reference) == (Decimal("500"), "delivery", "delivery:1")


def test_decrease_writes_negative_movement(beef):
    stock.increase({beef.id: Decimal("500")}, DELIVERY, "delivery:1")
    stock.decrease({beef.id: Decimal("200")}, SALE, "sale:1")
    assert on_hand(beef) == Decimal("300")
    assert StockMovement.objects.last().quantity == Decimal("-200")


def test_decrease_to_exactly_zero_is_allowed(beef):
    stock.increase({beef.id: Decimal("150")}, DELIVERY, "delivery:1")
    stock.decrease({beef.id: Decimal("150")}, SALE, "sale:1")
    assert on_hand(beef) == 0


def test_insufficient_decrease_reports_shortages_and_changes_nothing(beef, bun):
    stock.increase({beef.id: Decimal("120"), bun.id: Decimal("5")}, DELIVERY, "delivery:1")
    with pytest.raises(InsufficientStock) as error:
        stock.decrease({beef.id: Decimal("300"), bun.id: Decimal("2")}, SALE, "sale:1")
    assert error.value.extra["shortages"] == [
        {"ingredient": beef.id, "name": "Beef", "required": "300.000", "available": "120.000"},
    ]
    assert (on_hand(beef), on_hand(bun)) == (Decimal("120"), Decimal("5"))
    assert StockMovement.objects.count() == 2


def test_database_rejects_negative_on_hand(beef):
    with pytest.raises(IntegrityError), transaction.atomic():
        Ingredient.objects.filter(id=beef.id).update(on_hand=Decimal("-1"))


def test_on_hand_equals_sum_of_movements_after_mixed_operations(beef, bun):
    stock.increase({beef.id: Decimal("1000"), bun.id: Decimal("10")}, DELIVERY, "delivery:1")
    stock.decrease({beef.id: Decimal("150"), bun.id: Decimal("1")}, SALE, "sale:1")
    stock.increase({beef.id: Decimal("250.5")}, DELIVERY, "delivery:2")
    with pytest.raises(InsufficientStock):
        stock.decrease({beef.id: Decimal("5000"), bun.id: Decimal("1")}, SALE, "sale:2")
    stock.decrease({bun.id: Decimal("9")}, SALE, "sale:3")
    for ingredient in (beef, bun):
        assert on_hand(ingredient) == ledger_total(ingredient)
    assert on_hand(beef) == Decimal("1100.5")
    assert on_hand(bun) == 0
