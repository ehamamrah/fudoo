from decimal import Decimal

import pytest

from catalog.models import Ingredient
from purchasing.errors import IngredientNotSupplied
from purchasing.models import POLine, PurchaseOrder
from purchasing.services import create_purchase_order

pytestmark = pytest.mark.django_db


def line(ingredient):
    return {"ingredient": ingredient, "quantity_ordered": Decimal("1")}


def test_creates_order_for_supplied_ingredients(supplier, beef, bun):
    order = create_purchase_order(supplier, [line(beef), line(bun)])
    assert order.lines.count() == 2


def test_rejects_unsupplied_ingredients_and_creates_nothing(supplier, beef, lettuce):
    tomato = Ingredient.objects.create(name="Tomato", unit="g")
    with pytest.raises(IngredientNotSupplied) as error:
        create_purchase_order(supplier, [line(tomato), line(beef), line(lettuce)])
    assert error.value.code == "ingredient_not_supplied"
    assert error.value.detail == "Meat Co does not supply: Lettuce, Tomato."
    assert not PurchaseOrder.objects.exists()
    assert not POLine.objects.exists()


def test_existing_order_survives_mapping_removal(supplier, beef):
    order = create_purchase_order(supplier, [line(beef)])
    supplier.ingredients.remove(beef)
    assert PurchaseOrder.objects.get(pk=order.pk).lines.count() == 1
