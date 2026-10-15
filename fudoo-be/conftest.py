from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from catalog.models import Ingredient, Supplier
from catalog.services import create_menu_item


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
def supplier(db):
    return Supplier.objects.create(name="Meat Co", contact="orders@meatco.test")


@pytest.fixture
def burger(beef, bun):
    recipe = [
        {"ingredient": beef, "quantity": Decimal("150")},
        {"ingredient": bun, "quantity": Decimal("1")},
    ]
    return create_menu_item("Classic Burger", recipe)
