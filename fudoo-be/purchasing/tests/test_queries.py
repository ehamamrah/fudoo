from decimal import Decimal

import pytest

from core.testing import new_id
from purchasing.services import create_purchase_order, perform_action

pytestmark = pytest.mark.django_db
SIZES = [1, 6]


def sent_order(kitchen):
    lines = [{"ingredient": i, "quantity_ordered": Decimal("10")} for i in kitchen.ingredients]
    order, _ = create_purchase_order(new_id(), kitchen.supplier, lines)
    perform_action(order.id, "send")
    return order


@pytest.fixture
def orders(kitchen):
    def build(size):
        return [sent_order(kitchen(size, f"k{n}")) for n in range(size)]
    return build


def order_body(kitchen, request_id):
    lines = [{"ingredient": i.id, "quantity_ordered": "5"} for i in kitchen.ingredients]
    return {"request_id": request_id, "supplier": kitchen.supplier.id, "lines": lines}


def delivery_body(order, request_id):
    return {"request_id": request_id, "lines": [{"line": l.id, "quantity": "1"} for l in order.lines.all()]}


@pytest.mark.parametrize("size", SIZES)
@pytest.mark.parametrize("path", ["/api/purchase-orders/", "/api/purchase-orders/?status=open"])
def test_list_query_count_is_constant(api, orders, django_assert_num_queries, size, path):
    orders(size)
    with django_assert_num_queries(3):
        assert len(api.get(path).json()["results"]) == size


@pytest.mark.parametrize("size", SIZES)
def test_detail_query_count_is_constant(api, orders, django_assert_num_queries, size):
    order = orders(size)[0]
    with django_assert_num_queries(3):
        assert len(api.get(f"/api/purchase-orders/{order.id}/").json()["lines"]) == size


@pytest.mark.parametrize("size", SIZES)
def test_create_order_query_count_is_constant(api, kitchen, django_assert_num_queries, size):
    body = order_body(kitchen(size), "po-1")
    with django_assert_num_queries(11):
        assert api.post("/api/purchase-orders/", body).status_code == 201
    with django_assert_num_queries(7):
        assert api.post("/api/purchase-orders/", body).status_code == 200


@pytest.mark.parametrize("size", SIZES)
def test_delivery_query_count_is_constant(api, orders, django_assert_num_queries, size):
    order = orders(size)[0]
    path, body = f"/api/purchase-orders/{order.id}/deliveries/", delivery_body(order, "d-1")
    with django_assert_num_queries(21):
        assert api.post(path, body).status_code == 201
    with django_assert_num_queries(10):
        assert api.post(path, body).status_code == 200
