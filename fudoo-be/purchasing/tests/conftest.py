from decimal import Decimal

import pytest

from core.testing import new_id

from purchasing.models import Status
from purchasing.services import create_purchase_order, perform_action, receive_delivery


@pytest.fixture
def order(supplier, beef, bun):
    lines = [
        {"ingredient": beef, "quantity_ordered": Decimal("5000")},
        {"ingredient": bun, "quantity_ordered": Decimal("100")},
    ]
    return create_purchase_order("po-fixture", supplier, lines)[0]


PATHS = {
    Status.DRAFT: [],
    Status.SENT: ["send"],
    Status.CANCELLED: ["cancel"],
    Status.RECEIVED: ["send", "deliver"],
    Status.CLOSED: ["send", "deliver", "close"],
}


def _step(order, step):
    if step == "deliver":
        receive_delivery(order.id, new_id(), [{"line": order.lines.first().id, "quantity": Decimal("1")}])
    else:
        perform_action(order.id, step)


@pytest.fixture
def order_in():
    def drive(order, status):
        for step in PATHS[status]:
            _step(order, step)
        order.refresh_from_db()
        return order
    return drive


@pytest.fixture
def sent_order(order, order_in):
    return order_in(order, Status.SENT)


@pytest.fixture
def lines(order):
    return {line.ingredient.name: line for line in order.lines.all()}
