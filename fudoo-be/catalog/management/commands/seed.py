from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models import Ingredient, MenuItem, Supplier
from catalog.services import create_menu_item

INGREDIENTS = [
    ("Beef", "g"), ("Bun", "pcs"), ("Cheddar", "pcs"), ("Lettuce", "g"),
    ("Tomato", "g"), ("Onion", "g"), ("Ketchup", "ml"),
]
SUPPLIERS = [
    ("Meat Co", "orders@meatco.test", ["Beef", "Cheddar"]),
    ("Bakery Co", "orders@bakery.test", ["Bun"]),
    ("Fresh Farms", "orders@freshfarms.test", ["Lettuce", "Tomato", "Onion", "Cheddar", "Ketchup"]),
]
CLASSIC_BURGER = [
    ("Beef", "150"), ("Bun", "1"), ("Cheddar", "1"), ("Lettuce", "20"),
    ("Tomato", "30"), ("Onion", "15"), ("Ketchup", "15"),
]


class Command(BaseCommand):
    help = "Create sample ingredients, suppliers and the Classic Burger recipe."

    @transaction.atomic
    def handle(self, *args, **options):
        for name, unit in INGREDIENTS:
            Ingredient.objects.get_or_create(name=name, defaults={"unit": unit})
        for name, contact, ingredient_names in SUPPLIERS:
            _seed_supplier(name, contact, ingredient_names)
        if not MenuItem.objects.filter(name="Classic Burger").exists():
            create_menu_item("Classic Burger", _recipe(CLASSIC_BURGER))
        self.stdout.write(self.style.SUCCESS("Seed data ready."))


def _seed_supplier(name, contact, ingredient_names):
    supplier, _ = Supplier.objects.get_or_create(name=name, defaults={"contact": contact})
    supplier.ingredients.add(*Ingredient.objects.filter(name__in=ingredient_names))


def _recipe(lines):
    return [
        {"ingredient": Ingredient.objects.get(name=name), "quantity": Decimal(quantity)}
        for name, quantity in lines
    ]
