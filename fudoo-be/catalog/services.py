from django.db import transaction
from django.db.models import Count

from catalog.models import OUT_OF_STOCK, Ingredient, MenuItem, RecipeLine


@transaction.atomic
def create_menu_item(name, recipe):
    menu_item = MenuItem.objects.create(name=name)
    RecipeLine.objects.bulk_create(
        RecipeLine(menu_item=menu_item, ingredient=line["ingredient"], quantity=line["quantity"])
        for line in recipe
    )
    return menu_item


def stock_summary():
    return Ingredient.objects.aggregate(
        total=Count("id"),
        in_stock=Count("id", filter=~OUT_OF_STOCK),
        out_of_stock=Count("id", filter=OUT_OF_STOCK),
    )
