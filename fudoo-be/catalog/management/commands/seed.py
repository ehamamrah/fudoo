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
    ("Meat Co", "orders@meatco.test"),
    ("Bakery Co", "orders@bakery.test"),
    ("Fresh Farms", "orders@freshfarms.test"),
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
        for name, contact in SUPPLIERS:
            Supplier.objects.get_or_create(name=name, defaults={"contact": contact})
        if not MenuItem.objects.filter(name="Classic Burger").exists():
            create_menu_item("Classic Burger", _recipe(CLASSIC_BURGER))
        self.stdout.write(self.style.SUCCESS("Seed data ready."))


def _recipe(lines):
    return [
        {"ingredient": Ingredient.objects.get(name=name), "quantity": Decimal(quantity)}
        for name, quantity in lines
    ]
