import pytest

from conftest import build_burger
from sales.models import Sale

pytestmark = pytest.mark.django_db


def sell(api, external_id, menu_item, quantity=1):
    return api.post("/api/sales/", {"external_id": external_id, "menu_item": menu_item.id, "quantity": quantity})


def test_new_sale_returns_201(api, burger, beef, bun, stock_up):
    stock_up((beef, "300"), (bun, "2"))
    response = sell(api, "pos-1", burger, 2)
    assert response.status_code == 201
    data = response.json()
    assert data == {
        "id": data["id"], "external_id": "pos-1", "menu_item": burger.id,
        "menu_item_name": "Classic Burger", "quantity": 2, "sold_at": data["sold_at"],
    }


def test_duplicate_sale_returns_200_with_same_sale(api, burger, beef, bun, stock_up):
    stock_up((beef, "300"), (bun, "2"))
    first = sell(api, "pos-1", burger)
    again = sell(api, "pos-1", burger)
    assert again.status_code == 200
    assert again.json() == first.json()


@pytest.mark.parametrize("quantity", [2, 1])
def test_reused_external_id_with_other_payload_returns_409(api, burger, beef, bun, stock_up, quantity):
    stock_up((beef, "1000"), (bun, "10"))
    sell(api, "pos-1", burger, 1)
    other = build_burger(beef, bun, "Double") if quantity == 1 else burger
    response = sell(api, "pos-1", other, quantity)
    assert response.status_code == 409
    assert response.json() == {"code": "idempotency_conflict", "detail": response.json()["detail"]}
    assert Sale.objects.count() == 1


def test_insufficient_stock_returns_409_with_shortages(api, burger, beef, bun, stock_up):
    stock_up((beef, "120"), (bun, "5"))
    response = sell(api, "pos-1", burger, 2)
    assert response.status_code == 409
    assert response.json() == {
        "code": "insufficient_stock",
        "detail": response.json()["detail"],
        "shortages": [{"ingredient": beef.id, "name": "Beef", "required": "300.000", "available": "120.000"}],
    }


@pytest.mark.parametrize(("field", "body"), [
    ("quantity", {"external_id": "x", "quantity": 0}),
    ("quantity", {"external_id": "x", "quantity": "1.5"}),
    ("quantity", {"external_id": "x", "quantity": 10001}),
    ("quantity", {"external_id": "x", "quantity": 3000000000}),
    ("external_id", {"quantity": 1}),
    ("external_id", {"external_id": "", "quantity": 1}),
    ("external_id", {"external_id": "x" * 65, "quantity": 1}),
    ("menu_item", {"external_id": "x", "quantity": 1, "menu_item": 10**30}),
    ("menu_item", {"external_id": "x", "quantity": 1, "menu_item": 999999}),
])
def test_invalid_sale_rejected(api, burger, field, body):
    response = api.post("/api/sales/", {"menu_item": burger.id, **body})
    assert response.status_code == 400
    assert field in response.json()


def test_list_is_newest_first_in_pages_of_25(api, burger, beef, bun, stock_up):
    stock_up((beef, "100000"), (bun, "100"))
    for n in range(27):
        sell(api, f"pos-{n}", burger)
    data = api.get("/api/sales/").json()
    assert (len(data["results"]), data["results"][0]["external_id"], data["previous"]) == (25, "pos-26", None)
    assert data["next"].startswith("/api/sales/?cursor=")
    assert "count" not in data
