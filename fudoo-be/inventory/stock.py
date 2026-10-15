from django.db import transaction

from catalog.models import Ingredient
from core.quantities import format_quantity
from inventory.errors import InsufficientStock
from inventory.models import StockMovement


@transaction.atomic
def increase(quantities, reason, reference):
    _apply(_lock(quantities), quantities, 1, reason, reference)


@transaction.atomic
def decrease(quantities, reason, reference):
    ingredients = _lock(quantities)
    shortages = [_shortage(i, quantities[i.id]) for i in ingredients if i.on_hand < quantities[i.id]]
    if shortages:
        raise InsufficientStock(shortages)
    _apply(ingredients, quantities, -1, reason, reference)


def _lock(quantities):
    return list(Ingredient.objects.select_for_update().filter(id__in=quantities).order_by("id"))


def _apply(ingredients, quantities, sign, reason, reference):
    movements = []
    for ingredient in ingredients:
        delta = sign * quantities[ingredient.id]
        ingredient.on_hand += delta
        movements.append(StockMovement(
            ingredient=ingredient, quantity=delta, reason=reason, reference=reference
        ))
    Ingredient.objects.bulk_update(ingredients, ["on_hand"])
    StockMovement.objects.bulk_create(movements)


def _shortage(ingredient, required):
    return {
        "ingredient": ingredient.id,
        "name": ingredient.name,
        "required": format_quantity(required),
        "available": format_quantity(ingredient.on_hand),
    }
