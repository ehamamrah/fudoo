from django.db import transaction

from catalog.models import MenuItem, RecipeLine


@transaction.atomic
def create_menu_item(name, recipe):
    menu_item = MenuItem.objects.create(name=name)
    RecipeLine.objects.bulk_create(
        RecipeLine(menu_item=menu_item, ingredient=line["ingredient"], quantity=line["quantity"])
        for line in recipe
    )
    return menu_item
