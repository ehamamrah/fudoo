import pytest
from django.core.management import call_command

from catalog.models import Ingredient, MenuItem, Supplier, SupplierItem

pytestmark = pytest.mark.django_db


def test_seed_is_idempotent():
    call_command("seed")
    call_command("seed")
    assert Ingredient.objects.count() == 7
    assert Supplier.objects.count() == 3
    burger = MenuItem.objects.get(name="Classic Burger")
    assert burger.recipe.count() == 7
    assert all(ingredient.on_hand == 0 for ingredient in Ingredient.objects.all())


def supplied_names(supplier_name):
    return sorted(Supplier.objects.get(name=supplier_name).ingredients.values_list("name", flat=True))


def test_seed_maps_suppliers_to_ingredients():
    call_command("seed")
    call_command("seed")
    assert supplied_names("Meat Co") == ["Beef", "Cheddar"]
    assert supplied_names("Bakery Co") == ["Bun"]
    assert supplied_names("Fresh Farms") == ["Cheddar", "Ketchup", "Lettuce", "Onion", "Tomato"]
    assert SupplierItem.objects.count() == 8


def test_seed_adds_missing_mappings_to_existing_data():
    call_command("seed")
    SupplierItem.objects.filter(supplier__name="Meat Co").delete()
    call_command("seed")
    assert supplied_names("Meat Co") == ["Beef", "Cheddar"]
