import pytest

from conftest import order_line
from sales.services import record_order

pytestmark = pytest.mark.django_db
SIZES = [1, 6]


def body(external_id, kitchen, size):
    line = {"menu_item": kitchen.menu_item.id, "quantity": 1, "add_ons": [{"add_on": kitchen.add_on.id, "quantity": 1}]}
    return {"external_id": external_id, "lines": [line] * size}


@pytest.mark.parametrize("size", SIZES)
def test_list_query_count_is_constant(api, kitchen, django_assert_num_queries, size):
    for n in range(size):
        made = kitchen(2, f"k{n}")
        record_order(f"pos-{n}", [order_line(made.menu_item, 1, (made.add_on, 1))] * 2)
    with django_assert_num_queries(3):
        assert len(api.get("/api/orders/").json()["results"]) == size


@pytest.mark.parametrize("size", SIZES)
def test_record_order_query_count_is_constant(api, kitchen, django_assert_num_queries, size):
    made = kitchen(size)
    with django_assert_num_queries(17):
        assert api.post("/api/orders/", body("pos-1", made, size)).status_code == 201
    with django_assert_num_queries(7):
        assert api.post("/api/orders/", body("pos-1", made, size)).status_code == 200
