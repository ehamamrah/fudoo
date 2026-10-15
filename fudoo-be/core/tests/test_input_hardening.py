from decimal import Decimal

import pytest

from core.validation import MAX_LIST_ITEMS
from purchasing.services import create_purchase_order, perform_action

pytestmark = pytest.mark.django_db
HUGE_ID = 10**30
TOO_MANY = MAX_LIST_ITEMS + 1
WRITE_PATHS = ["/api/ingredients/", "/api/suppliers/", "/api/menu-items/", "/api/purchase-orders/", "/api/sales/"]


@pytest.fixture
def paths(supplier, beef):
    order, _ = create_purchase_order("po-0", supplier, [{"ingredient": beef, "quantity_ordered": Decimal("1")}])
    perform_action(order.id, "send")
    return {
        "actions": f"/api/purchase-orders/{order.id}/actions/",
        "deliveries": f"/api/purchase-orders/{order.id}/deliveries/",
    }


@pytest.mark.parametrize("path", WRITE_PATHS)
@pytest.mark.parametrize("raw", ["{bad json", "[]", "null", '"text"', "1e400"])
def test_malformed_bodies_are_rejected(api, db, path, raw):
    assert api.generic("POST", path, raw, content_type="application/json").status_code == 400


def test_oversized_body_is_rejected(api, db):
    body = {"name": "x" * 3_000_000, "unit": "g"}
    assert api.post("/api/ingredients/", body).status_code == 400


@pytest.mark.parametrize("url", [
    f"/api/purchase-orders/{HUGE_ID}/", f"/api/suppliers/{HUGE_ID}/",
])
def test_huge_ids_in_urls_are_not_found(api, db, url):
    assert api.get(url).status_code == 404


def test_huge_id_in_action_and_delivery_urls_is_not_found(api, db):
    assert api.post(f"/api/purchase-orders/{HUGE_ID}/actions/", {"action": "send"}).status_code == 404
    body = {"request_id": "d", "lines": [{"line": 1, "quantity": "1"}]}
    assert api.post(f"/api/purchase-orders/{HUGE_ID}/deliveries/", body).status_code == 404


def po_body(supplier, ingredient, **overrides):
    line = {"ingredient": ingredient, "quantity_ordered": "1"}
    return {"request_id": "po-1", "supplier": supplier, "lines": [line], **overrides}


@pytest.mark.parametrize(("field", "make"), [
    ("supplier", lambda s, i: po_body(HUGE_ID, i)),
    ("lines", lambda s, i: po_body(s, HUGE_ID)),
    ("lines", lambda s, i: po_body(s, i, lines=[{"ingredient": n, "quantity_ordered": "1"} for n in range(1, TOO_MANY + 1)])),
    ("lines", lambda s, i: po_body(s, i, lines=[1])),
    ("lines", lambda s, i: po_body(s, i, lines={"ingredient": i})),
    ("request_id", lambda s, i: po_body(s, i, request_id=None)),
    ("request_id", lambda s, i: po_body(s, i, request_id="a\x00b")),
])
def test_bad_purchase_orders_are_rejected(api, supplier, beef, field, make):
    response = api.post("/api/purchase-orders/", make(supplier.id, beef.id))
    assert response.status_code == 400
    assert field in response.json()


@pytest.mark.parametrize("quantity", ["1e1000", "NaN", "Infinity", "-Infinity", "1000000000", "0.0001", "", None, [], "1" * 5000])
def test_bad_quantities_are_rejected(api, supplier, beef, quantity):
    body = po_body(supplier.id, beef.id, lines=[{"ingredient": beef.id, "quantity_ordered": quantity}])
    assert api.post("/api/purchase-orders/", body).status_code == 400


@pytest.mark.parametrize("action", ["x" * 17, ["send"], None])
def test_bad_actions_are_rejected(api, paths, action):
    assert api.post(paths["actions"], {"action": action}).status_code == 400


def test_bad_deliveries_are_rejected(api, paths):
    too_many = [{"line": n, "quantity": "1"} for n in range(1, TOO_MANY + 1)]
    for lines in (too_many, [{"line": HUGE_ID, "quantity": "1"}], [{"line": "x", "quantity": "1"}]):
        response = api.post(paths["deliveries"], {"request_id": "d-1", "lines": lines})
        assert (response.status_code, list(response.json())) == (400, ["lines"])


@pytest.mark.parametrize("ingredients", [[HUGE_ID], list(range(1, TOO_MANY + 1)), "1", [None], [-1]])
def test_bad_supplier_ingredients_are_rejected(api, db, ingredients):
    response = api.post("/api/suppliers/", {"name": "Veg Co", "ingredients": ingredients})
    assert response.status_code == 400
    assert "ingredients" in response.json()


@pytest.mark.parametrize("recipe", [
    [{"ingredient": HUGE_ID, "quantity": "1"}],
    [{"ingredient": n, "quantity": "1"} for n in range(1, TOO_MANY + 1)],
])
def test_bad_recipes_are_rejected(api, db, recipe):
    response = api.post("/api/menu-items/", {"name": "Burger", "recipe": recipe})
    assert response.status_code == 400
    assert "recipe" in response.json()


@pytest.mark.parametrize(("path", "body", "field"), [
    ("/api/ingredients/", {"name": "x" * 101, "unit": "g"}, "name"),
    ("/api/ingredients/", {"name": "a\x00b", "unit": "g"}, "name"),
    ("/api/suppliers/", {"name": "Veg", "contact": "x" * 256}, "contact"),
    ("/api/sales/", {"external_id": "a", "menu_item": 1, "quantity": 1.5}, "quantity"),
])
def test_oversized_or_invalid_strings_are_rejected(api, db, path, body, field):
    response = api.post(path, body)
    assert response.status_code == 400
    assert field in response.json()


def test_large_valid_order_is_accepted(api, supplier, beef):
    body = po_body(supplier.id, beef.id, lines=[{"ingredient": beef.id, "quantity_ordered": "999999999.999"}])
    response = api.post("/api/purchase-orders/", body)
    assert response.status_code == 201
    assert response.json()["lines"][0]["quantity_ordered"] == "999999999.999"
