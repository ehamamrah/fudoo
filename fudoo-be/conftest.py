from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from catalog.models import Ingredient, Supplier
from catalog.services import create_menu_item
from inventory import stock
from inventory.models import StockMovement


def build_burger(beef, bun, name="Classic Burger"):
    recipe = [
        {"ingredient": beef, "quantity": Decimal("150")},
        {"ingredient": bun, "quantity": Decimal("1")},
    ]
    return create_menu_item(name, recipe)


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def beef(db):
    return Ingredient.objects.create(name="Beef", unit="g")


@pytest.fixture
def bun(db):
    return Ingredient.objects.create(name="Bun", unit="pcs")


@pytest.fixture
def lettuce(db):
    return Ingredient.objects.create(name="Lettuce", unit="g")


@pytest.fixture
def supplier(beef, bun):
    supplier = Supplier.objects.create(name="Meat Co", contact="orders@meatco.test")
    supplier.ingredients.add(beef, bun)
    return supplier


@pytest.fixture
def burger(beef, bun):
    return build_burger(beef, bun)


@pytest.fixture
def fresh_burger(db):
    def build(tag):
        beef = Ingredient.objects.create(name=f"Beef {tag}", unit="g")
        bun = Ingredient.objects.create(name=f"Bun {tag}", unit="pcs")
        return build_burger(beef, bun, f"Burger {tag}"), beef, bun
    return build


@pytest.fixture
def stock_up(db):
    def add(*pairs):
        quantities = {ingredient.id: Decimal(quantity) for ingredient, quantity in pairs}
        stock.increase(quantities, StockMovement.Reason.DELIVERY, "test")
    return add
