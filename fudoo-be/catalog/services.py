from django.db import transaction
from django.db.models import Count

from catalog.models import OUT_OF_STOCK, AddOn, Ingredient, MenuItem


def create_menu_item(name, recipe):
    return _create_with_recipe(MenuItem, name, recipe)


def create_add_on(name, recipe):
    return _create_with_recipe(AddOn, name, recipe)


@transaction.atomic
def _create_with_recipe(model, name, recipe):
    owner = model.objects.create(name=name)
    lines = owner.recipe
    lines.model.objects.bulk_create(
        lines.model(
            **{lines.field.name: owner}, ingredient=line["ingredient"], quantity=line["quantity"]
        )
        for line in recipe
    )
    return owner


def stock_summary():
    return Ingredient.objects.aggregate(
        total=Count("id"),
        in_stock=Count("id", filter=~OUT_OF_STOCK),
        out_of_stock=Count("id", filter=OUT_OF_STOCK),
    )
