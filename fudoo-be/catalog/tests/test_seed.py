import pytest
from django.core.management import call_command

from catalog.models import Ingredient, MenuItem, Supplier

pytestmark = pytest.mark.django_db


def test_seed_is_idempotent():
    call_command("seed")
    call_command("seed")
    assert Ingredient.objects.count() == 7
    assert Supplier.objects.count() == 3
    burger = MenuItem.objects.get(name="Classic Burger")
    assert burger.recipe.count() == 7
    assert all(ingredient.on_hand == 0 for ingredient in Ingredient.objects.all())
