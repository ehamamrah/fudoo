import pytest

from sales.services import record_sale

pytestmark = pytest.mark.django_db
SIZES = [1, 6]


def sell(api, external_id, menu_item):
    return api.post("/api/sales/", {"external_id": external_id, "menu_item": menu_item.id, "quantity": 1})


@pytest.mark.parametrize("size", SIZES)
def test_list_query_count_is_constant(api, kitchen, django_assert_num_queries, size):
    for n in range(size):
        record_sale(f"pos-{n}", kitchen(1, f"k{n}").menu_item, 1)
    with django_assert_num_queries(1):
        assert len(api.get("/api/sales/").json()["results"]) == size


@pytest.mark.parametrize("size", SIZES)
def test_record_sale_query_count_is_constant(api, kitchen, django_assert_num_queries, size):
    menu_item = kitchen(size).menu_item
    with django_assert_num_queries(11):
        assert sell(api, "pos-1", menu_item).status_code == 201
    with django_assert_num_queries(3):
        assert sell(api, "pos-1", menu_item).status_code == 200
