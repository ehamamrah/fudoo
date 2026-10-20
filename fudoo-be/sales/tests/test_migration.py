from datetime import UTC, datetime

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

pytestmark = pytest.mark.django_db(transaction=True)
BEFORE = [("sales", "0002_external_id_length_and_index"), ("catalog", "0005_add_ons")]
AFTER = [("sales", "0004_remove_sale")]
SOLD_AT = datetime(2026, 10, 1, 12, 30, tzinfo=UTC)


def migrate(targets):
    executor = MigrationExecutor(connection)
    executor.loader.build_graph()
    executor.migrate(targets)
    return executor.loader.project_state(targets).apps


@pytest.fixture(autouse=True)
def back_to_latest():
    yield
    executor = MigrationExecutor(connection)
    executor.migrate(executor.loader.graph.leaf_nodes())


def record_old_sale(apps):
    menu_item = apps.get_model("catalog", "MenuItem").objects.create(name="Classic Burger")
    Sale = apps.get_model("sales", "Sale")
    sale = Sale.objects.create(external_id="pos-old", menu_item=menu_item, quantity=3)
    Sale.objects.filter(pk=sale.pk).update(sold_at=SOLD_AT)
    return menu_item


def test_each_sale_becomes_a_one_line_completed_order():
    menu_item = record_old_sale(migrate(BEFORE))
    order = migrate(AFTER).get_model("sales", "Order").objects.get()
    line = order.lines.get()
    assert (order.external_id, order.status, order.ordered_at) == ("pos-old", "completed", SOLD_AT)
    assert (line.menu_item_id, line.quantity, line.status, line.shortages) == (menu_item.id, 3, "fulfilled", [])
    assert not line.add_ons.exists()


def test_reverse_restores_one_line_orders_as_sales():
    menu_item = record_old_sale(migrate(BEFORE))
    migrate(AFTER)
    sale = migrate(BEFORE).get_model("sales", "Sale").objects.get()
    assert (sale.external_id, sale.menu_item_id, sale.quantity, sale.sold_at) == ("pos-old", menu_item.id, 3, SOLD_AT)
