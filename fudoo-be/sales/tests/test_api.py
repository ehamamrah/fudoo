from decimal import Decimal

import pytest

from catalog.models import Ingredient
from catalog.services import create_menu_item
from core.validation import MAX_LIST_ITEMS
from inventory.models import StockMovement
from sales.models import Order, OrderLine

pytestmark = pytest.mark.django_db
HUGE_ID = 10**30


@pytest.fixture
def cola(db, stock_up):
    can = Ingredient.objects.create(name="Cola can", unit="pcs")
    stock_up((can, "10"))
    return create_menu_item("Cola", [{"ingredient": can, "quantity": Decimal("1")}])


@pytest.fixture
def stocked(beef, bun, cheddar, stock_up):
    stock_up((beef, "1000"), (bun, "10"), (cheddar, "1"))


def post(api, lines, external_id="pos-2026-10-20-0042"):
    return api.post("/api/orders/", {"external_id": external_id, "lines": lines})


def contract_lines(burger, extra_cheese, cola):
    return [
        {"menu_item": burger.id, "quantity": 2, "add_ons": [{"add_on": extra_cheese.id, "quantity": 1}]},
        {"menu_item": cola.id, "quantity": 1},
    ]


def test_new_order_returns_201_in_contract_shape(api, burger, extra_cheese, cola, cheddar, stocked):
    response = post(api, contract_lines(burger, extra_cheese, cola))
    assert response.status_code == 201
    data = response.json()
    first, second = data["lines"]
    assert data == {
        "id": data["id"], "external_id": "pos-2026-10-20-0042", "status": "partial", "ordered_at": data["ordered_at"],
        "lines": [
            {
                "id": first["id"], "menu_item": burger.id, "menu_item_name": "Classic Burger", "quantity": 2,
                "status": "fulfilled", "shortages": [],
                "add_ons": [{
                    "id": first["add_ons"][0]["id"], "add_on": extra_cheese.id, "add_on_name": "Extra cheese",
                    "quantity": 1, "status": "skipped",
                    "shortages": [{"ingredient": cheddar.id, "name": "Cheddar", "required": "2.000", "available": "1.000"}],
                }],
            },
            {
                "id": second["id"], "menu_item": cola.id, "menu_item_name": "Cola", "quantity": 1,
                "status": "fulfilled", "shortages": [], "add_ons": [],
            },
        ],
    }
    assert data["ordered_at"].endswith("Z")


def test_repeated_order_returns_200_with_the_recorded_body(api, burger, extra_cheese, cola, cheddar, stocked, stock_up):
    first = post(api, contract_lines(burger, extra_cheese, cola))
    stock_up((cheddar, "50"))
    lines = contract_lines(burger, extra_cheese, cola)
    lines[1]["add_ons"] = []
    again = post(api, lines)
    assert (again.status_code, again.json()) == (200, first.json())


def test_reused_external_id_with_other_lines_returns_409(api, burger, extra_cheese, cola, stocked):
    post(api, contract_lines(burger, extra_cheese, cola))
    response = post(api, contract_lines(burger, extra_cheese, cola)[::-1])
    assert response.status_code == 409
    assert response.json() == {"code": "idempotency_conflict", "detail": response.json()["detail"]}
    assert Order.objects.count() == 1


def test_every_line_short_returns_409_with_summed_shortages(api, burger, beef, bun, stock_up):
    stock_up((beef, "120"), (bun, "5"))
    response = post(api, [{"menu_item": burger.id, "quantity": 1}, {"menu_item": burger.id, "quantity": 1}])
    assert response.status_code == 409
    assert response.json() == {
        "code": "insufficient_stock",
        "detail": response.json()["detail"],
        "shortages": [{"ingredient": beef.id, "name": "Beef", "required": "300.000", "available": "120.000"}],
    }
    assert (Order.objects.count(), StockMovement.objects.filter(reason="sale").count()) == (0, 0)


def line(menu_item, quantity=1, add_ons=None):
    return {"menu_item": menu_item, "quantity": quantity, **({} if add_ons is None else {"add_ons": add_ons})}


def cheese(add_on, quantity=1):
    return [{"add_on": add_on, "quantity": quantity}]


@pytest.mark.parametrize(("field", "make"), [
    ("lines", lambda b, c: {"lines": []}),
    ("lines", lambda b, c: {}),
    ("lines", lambda b, c: {"lines": "x"}),
    ("lines", lambda b, c: {"lines": [line(b)] * (MAX_LIST_ITEMS + 1)}),
    ("lines", lambda b, c: {"lines": [line(b, 0)]}),
    ("lines", lambda b, c: {"lines": [line(b, "1.5")]}),
    ("lines", lambda b, c: {"lines": [line(b, 10001)]}),
    ("lines", lambda b, c: {"lines": [line(b, 3000000000)]}),
    ("lines", lambda b, c: {"lines": [line(HUGE_ID)]}),
    ("lines", lambda b, c: {"lines": [line(b, 1, cheese(c) * 2)]}),
    ("lines", lambda b, c: {"lines": [line(b, 1, [{"add_on": n, "quantity": 1} for n in range(1, 12)])]}),
    ("lines", lambda b, c: {"lines": [line(b, 1, cheese(c, 11))]}),
    ("lines", lambda b, c: {"lines": [line(b, 1, cheese(c, 0))]}),
    ("lines", lambda b, c: {"lines": [line(b, 1, cheese(HUGE_ID))]}),
    ("lines", lambda b, c: {"lines": [line(b, 1, "x")]}),
    ("external_id", lambda b, c: {"lines": [line(b)], "external_id": ""}),
    ("external_id", lambda b, c: {"lines": [line(b)], "external_id": "x" * 65}),
])
def test_invalid_orders_are_rejected(api, burger, extra_cheese, field, make):
    response = api.post("/api/orders/", {"external_id": "pos-1", **make(burger.id, extra_cheese.id)})
    assert (response.status_code, list(response.json())) == (400, [field])
    assert not Order.objects.exists()


def test_missing_add_ons_and_empty_add_ons_are_the_same_request(api, burger, stocked):
    first = post(api, [line(burger.id)])
    again = post(api, [line(burger.id, 1, [])])
    assert (first.status_code, again.status_code, again.json()) == (201, 200, first.json())
    assert first.json()["lines"][0]["add_ons"] == []


@pytest.mark.parametrize("kind", ["menu_item", "add_on"])
def test_unknown_ids_are_listed(api, burger, extra_cheese, kind):
    add_ons = [{"add_on": 999999 if kind == "add_on" else extra_cheese.id, "quantity": 1}]
    response = post(api, [line(999999 if kind == "menu_item" else burger.id, 1, add_ons)])
    assert (response.status_code, response.json()) == (400, {"lines": ["Unknown ids: [999999]."]})


def test_duplicate_add_on_in_a_line_is_400(api, burger, extra_cheese):
    response = post(api, [line(burger.id, 1, cheese(extra_cheese.id) * 2)])
    assert response.status_code == 400
    assert "lines" in response.json()


def test_limits_at_the_edge_are_accepted(api, burger, extra_cheese, beef, bun, cheddar, stock_up):
    stock_up((beef, "999999999"), (bun, "999999"), (cheddar, "999999"))
    add_ons = [{"add_on": extra_cheese.id, "quantity": 10}]
    assert post(api, [line(burger.id, 10000, add_ons)] + [line(burger.id)] * 99).status_code == 201
    assert OrderLine.objects.count() == 100


def test_the_same_menu_item_may_appear_on_several_lines(api, burger, stocked):
    response = post(api, [line(burger.id), line(burger.id)])
    assert [row["status"] for row in response.json()["lines"]] == ["fulfilled", "fulfilled"]


def test_list_is_newest_first_with_lines_and_add_ons_embedded(api, burger, extra_cheese, cola, beef, bun, stocked, stock_up):
    stock_up((beef, "5000"), (bun, "50"), (cola.recipe.get().ingredient, "50"))
    for n in range(27):
        lines = [line(cola.id, 1, cheese(extra_cheese.id))] if n % 2 else [line(burger.id)]
        post(api, lines, f"pos-{n}")
    data = api.get("/api/orders/").json()
    assert (len(data["results"]), data["results"][0]["external_id"], data["previous"]) == (25, "pos-26", None)
    assert data["results"][1]["lines"][0]["add_ons"][0]["add_on_name"] == "Extra cheese"
    assert data["next"].startswith("/api/orders/?cursor=")
    assert "count" not in data


def test_sales_endpoint_is_gone(api, db):
    assert api.get("/api/sales/").status_code == 404
