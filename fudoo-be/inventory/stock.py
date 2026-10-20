from django.db import transaction

from catalog.models import Ingredient
from core.quantities import format_quantity
from inventory.errors import InsufficientStock
from inventory.models import StockMovement

INCREASE = 1
DECREASE = -1


@transaction.atomic
def increase(quantities, reason, reference):
    hold(quantities).deposit([(reference, quantities)], reason)


@transaction.atomic
def decrease(quantities, reason, reference):
    held = hold(quantities)
    shortages = held.reserve(quantities)
    if shortages:
        raise InsufficientStock(shortages)
    held.withdraw([(reference, quantities)], reason)


def hold(ingredient_ids):
    """Locks the ingredients until the caller's transaction ends, in id order so concurrent holds never deadlock."""
    locked = Ingredient.objects.select_for_update().filter(id__in=ingredient_ids).order_by("id")
    return StockHold(list(locked))


class StockHold:
    def __init__(self, ingredients):
        self._ingredients = {ingredient.id: ingredient for ingredient in ingredients}
        self._remaining = {ingredient.id: ingredient.on_hand for ingredient in ingredients}

    def shortages(self, quantities):
        return [
            _shortage(self._ingredients[pk], required, self._remaining[pk])
            for pk, required in sorted(quantities.items())
            if self._remaining[pk] < required
        ]

    def reserve(self, quantities):
        """Takes the quantities from the remaining stock only if every one is covered; returns the shortages otherwise."""
        shortages = self.shortages(quantities)
        if not shortages:
            for pk, required in quantities.items():
                self._remaining[pk] -= required
        return shortages

    def withdraw(self, changes, reason):
        self._write(changes, reason, DECREASE)

    def deposit(self, changes, reason):
        self._write(changes, reason, INCREASE)

    def _write(self, changes, reason, sign):
        movements = [
            StockMovement(ingredient_id=pk, quantity=sign * quantity, reason=reason, reference=reference)
            for reference, quantities in changes
            for pk, quantity in quantities.items()
        ]
        for movement in movements:
            self._ingredients[movement.ingredient_id].on_hand += movement.quantity
        touched = sorted({movement.ingredient_id for movement in movements})
        Ingredient.objects.bulk_update([self._ingredients[pk] for pk in touched], ["on_hand"])
        StockMovement.objects.bulk_create(movements)


def _shortage(ingredient, required, available):
    return {
        "ingredient": ingredient.id,
        "name": ingredient.name,
        "required": format_quantity(required),
        "available": format_quantity(available),
    }
