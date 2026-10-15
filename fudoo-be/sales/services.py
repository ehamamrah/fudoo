from django.db import transaction

from core.idempotency import create_once
from inventory import stock
from inventory.models import StockMovement
from sales.models import Sale


def record_sale(external_id, menu_item, quantity):
    """Returns (sale, created). A repeated external_id with the same menu item and quantity returns the original untouched."""
    return create_once(
        find=lambda: Sale.objects.select_related("menu_item").filter(external_id=external_id).first(),
        create=lambda: _create_sale(external_id, menu_item, quantity),
        matches=lambda sale: (sale.menu_item_id, sale.quantity) == (menu_item.id, quantity),
    )


@transaction.atomic
def _create_sale(external_id, menu_item, quantity):
    sale = Sale.objects.create(external_id=external_id, menu_item=menu_item, quantity=quantity)
    required = {line.ingredient_id: line.quantity * quantity for line in menu_item.recipe.all()}
    stock.decrease(required, StockMovement.Reason.SALE, f"sale:{sale.id}")
    return sale
