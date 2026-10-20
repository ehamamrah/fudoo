from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models import AddOn, Ingredient, MenuItem, Supplier
from catalog.services import create_add_on, create_menu_item

INGREDIENTS = [
    ("Beef", "g"), ("Bun", "pcs"), ("Cheddar", "pcs"), ("Lettuce", "g"),
    ("Tomato", "g"), ("Onion", "g"), ("Ketchup", "ml"), ("Cola can", "pcs"),
]
SUPPLIERS = [
    ("Meat Co", "orders@meatco.test", ["Beef", "Cheddar"]),
    ("Bakery Co", "orders@bakery.test", ["Bun"]),
    ("Fresh Farms", "orders@freshfarms.test", ["Lettuce", "Tomato", "Onion", "Cheddar", "Ketchup", "Cola can"]),
]
MENU_ITEMS = {
    "Classic Burger": [
        ("Beef", "150"), ("Bun", "1"), ("Cheddar", "1"), ("Lettuce", "20"),
        ("Tomato", "30"), ("Onion", "15"), ("Ketchup", "15"),
    ],
    "Cola": [("Cola can", "1")],
}
ADD_ONS = {"Extra cheese": [("Cheddar", "1")]}


class Command(BaseCommand):
    help = "Create sample ingredients, suppliers, menu items and add-ons."

    @transaction.atomic
    def handle(self, *args, **options):
        for name, unit in INGREDIENTS:
            Ingredient.objects.get_or_create(name=name, defaults={"unit": unit})
        for name, contact, ingredient_names in SUPPLIERS:
            _seed_supplier(name, contact, ingredient_names)
        _seed_recipes(MenuItem, create_menu_item, MENU_ITEMS)
        _seed_recipes(AddOn, create_add_on, ADD_ONS)
        self.stdout.write(self.style.SUCCESS("Seed data ready."))


def _seed_supplier(name, contact, ingredient_names):
    supplier, _ = Supplier.objects.get_or_create(name=name, defaults={"contact": contact})
    supplier.ingredients.add(*Ingredient.objects.filter(name__in=ingredient_names))


def _seed_recipes(model, create, recipes):
    for name, lines in recipes.items():
        if not model.objects.filter(name=name).exists():
            create(name, _recipe(lines))


def _recipe(lines):
    return [
        {"ingredient": Ingredient.objects.get(name=name), "quantity": Decimal(quantity)}
        for name, quantity in lines
    ]
