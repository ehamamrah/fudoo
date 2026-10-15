from decimal import Decimal

import pytest

from conftest import build_burger

from core.idempotency import IdempotencyConflict
from inventory.errors import InsufficientStock
from inventory.models import StockMovement
from sales.models import Sale
from sales.services import record_sale

pytestmark = pytest.mark.django_db


def levels(*ingredients):
    for ingredient in ingredients:
        ingredient.refresh_from_db()
    return tuple(ingredient.on_hand for ingredient in ingredients)


def test_sale_deducts_recipe_times_quantity(burger, beef, bun, stock_up):
    stock_up((beef, "1000"), (bun, "10"))
    sale, created = record_sale("pos-1", burger, 3)
    assert created
    assert levels(beef, bun) == (Decimal("550"), Decimal("7"))
    sale_movements = StockMovement.objects.filter(reason="sale", reference=f"sale:{sale.id}")
    assert sorted(m.quantity for m in sale_movements) == [Decimal("-450"), Decimal("-3")]


def test_insufficient_stock_rejected_with_nothing_deducted(burger, beef, bun, stock_up):
    stock_up((beef, "120"), (bun, "10"))
    with pytest.raises(InsufficientStock) as error:
        record_sale("pos-1", burger, 2)
    assert error.value.extra["shortages"] == [
        {"ingredient": beef.id, "name": "Beef", "required": "300.000", "available": "120.000"},
    ]
    assert levels(beef, bun) == (Decimal("120"), Decimal("10"))
    assert not Sale.objects.exists()
    assert not StockMovement.objects.filter(reason="sale").exists()


def test_ingredient_never_stocked_is_a_shortage(burger, beef, bun, stock_up):
    stock_up((beef, "1000"))
    with pytest.raises(InsufficientStock) as error:
        record_sale("pos-1", burger, 1)
    assert [s["name"] for s in error.value.extra["shortages"]] == ["Bun"]


def test_duplicate_external_id_is_idempotent(burger, beef, bun, stock_up):
    stock_up((beef, "1000"), (bun, "10"))
    first, _ = record_sale("pos-1", burger, 1)
    again, created = record_sale("pos-1", burger, 1)
    assert (again.id, created) == (first.id, False)
    assert levels(beef, bun) == (Decimal("850"), Decimal("9"))
    assert Sale.objects.count() == 1


@pytest.mark.parametrize("change", ["quantity", "menu_item"])
def test_reused_external_id_with_other_payload_conflicts(burger, beef, bun, stock_up, change):
    stock_up((beef, "1000"), (bun, "10"))
    record_sale("pos-1", burger, 1)
    other = build_burger(beef, bun, "Double") if change == "menu_item" else burger
    with pytest.raises(IdempotencyConflict):
        record_sale("pos-1", other, 2 if change == "quantity" else 1)
    assert levels(beef, bun) == (Decimal("850"), Decimal("9"))
    assert Sale.objects.count() == 1


def test_rejected_sale_can_be_retried_after_restock(burger, beef, bun, stock_up):
    with pytest.raises(InsufficientStock):
        record_sale("pos-1", burger, 1)
    stock_up((beef, "150"), (bun, "1"))
    assert record_sale("pos-1", burger, 1)[1]
    assert levels(beef, bun) == (0, 0)
