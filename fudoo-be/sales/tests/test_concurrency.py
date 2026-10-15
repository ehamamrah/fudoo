import threading
from decimal import Decimal

import pytest
from django.db import connection
from django.db.models import Sum

from inventory.errors import InsufficientStock
from inventory.models import StockMovement
from sales.models import Sale
from sales.services import record_sale

pytestmark = pytest.mark.django_db(transaction=True)


def race(*calls):
    barrier = threading.Barrier(len(calls))
    outcomes = []

    def run(call):
        try:
            barrier.wait()
            outcomes.append(call())
        except InsufficientStock as error:
            outcomes.append(error)
        finally:
            connection.close()

    threads = [threading.Thread(target=run, args=(call,)) for call in calls]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return outcomes


def test_two_sales_racing_for_last_stock_cannot_both_succeed(burger, beef, bun, stock_up):
    stock_up((beef, "150"), (bun, "1"))
    outcomes = race(lambda: record_sale("pos-a", burger, 1), lambda: record_sale("pos-b", burger, 1))
    assert sum(isinstance(o, InsufficientStock) for o in outcomes) == 1
    assert Sale.objects.count() == 1
    beef.refresh_from_db()
    assert beef.on_hand == 0
    assert StockMovement.objects.filter(ingredient=beef).aggregate(t=Sum("quantity"))["t"] == 0


def test_same_external_id_racing_deducts_once(burger, beef, bun, stock_up):
    stock_up((beef, "1000"), (bun, "10"))
    outcomes = race(lambda: record_sale("pos-a", burger, 1), lambda: record_sale("pos-a", burger, 1))
    assert sorted(created for _, created in outcomes) == [False, True]
    assert len({sale.id for sale, _ in outcomes}) == 1
    beef.refresh_from_db()
    assert beef.on_hand == Decimal("850")
