from decimal import Decimal

import pytest

from inventory import stock
from inventory.models import StockMovement


@pytest.fixture
def stock_up():
    def add(*pairs):
        quantities = {ingredient.id: Decimal(quantity) for ingredient, quantity in pairs}
        stock.increase(quantities, StockMovement.Reason.DELIVERY, "test")
    return add
