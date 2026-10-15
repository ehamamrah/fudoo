from django.db import IntegrityError, transaction

from inventory import stock
from inventory.models import StockMovement
from sales.models import Sale


def record_sale(external_id, menu_item, quantity):
    """Returns (sale, created). A repeated external_id returns the original sale untouched."""
    existing = Sale.objects.filter(external_id=external_id).first()
    if existing:
        return existing, False
    try:
        return _create_sale(external_id, menu_item, quantity), True
    except IntegrityError as error:
        return _existing_or_raise(external_id, error), False


@transaction.atomic
def _create_sale(external_id, menu_item, quantity):
    sale = Sale.objects.create(external_id=external_id, menu_item=menu_item, quantity=quantity)
    required = {line.ingredient_id: line.quantity * quantity for line in menu_item.recipe.all()}
    stock.decrease(required, StockMovement.Reason.SALE, f"sale:{sale.id}")
    return sale


def _existing_or_raise(external_id, error):
    existing = Sale.objects.filter(external_id=external_id).first()
    if existing is None:
        raise error
    return existing
