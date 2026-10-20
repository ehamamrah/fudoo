from decimal import Decimal

import pytest
from django.core.management import call_command

from catalog.models import AddOn, Ingredient, MenuItem, Supplier, SupplierItem

pytestmark = pytest.mark.django_db


def test_seed_is_idempotent():
    call_command("seed")
    call_command("seed")
    assert Ingredient.objects.count() == 8
    assert Supplier.objects.count() == 3
    assert MenuItem.objects.get(name="Classic Burger").recipe.count() == 7
    assert recipe_of(MenuItem.objects.get(name="Cola")) == [("Cola can", "pcs", Decimal("1"))]
    assert recipe_of(AddOn.objects.get()) == [("Cheddar", "pcs", Decimal("1"))]
    assert all(ingredient.on_hand == 0 for ingredient in Ingredient.objects.all())


def recipe_of(owner):
    return [(line.ingredient.name, line.ingredient.unit, line.quantity) for line in owner.recipe.all()]


def supplied_names(supplier_name):
    return sorted(Supplier.objects.get(name=supplier_name).ingredients.values_list("name", flat=True))


def test_seed_maps_suppliers_to_ingredients():
    call_command("seed")
    call_command("seed")
    assert supplied_names("Meat Co") == ["Beef", "Cheddar"]
    assert supplied_names("Bakery Co") == ["Bun"]
    assert supplied_names("Fresh Farms") == ["Cheddar", "Cola can", "Ketchup", "Lettuce", "Onion", "Tomato"]
    assert SupplierItem.objects.count() == 9


def test_seed_adds_missing_mappings_to_existing_data():
    call_command("seed")
    SupplierItem.objects.filter(supplier__name="Meat Co").delete()
    call_command("seed")
    assert supplied_names("Meat Co") == ["Beef", "Cheddar"]
