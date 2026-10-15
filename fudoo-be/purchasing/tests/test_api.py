from decimal import Decimal

import pytest

from core.testing import new_id
from purchasing.models import PurchaseOrder, Status
from purchasing.services import create_purchase_order

pytestmark = pytest.mark.django_db


def url(order, suffix=""):
    return f"/api/purchase-orders/{order.id}/{suffix}"


def test_create_purchase_order_in_draft(api, supplier, beef):
    body = {"request_id": "po-1", "supplier": supplier.id, "lines": [{"ingredient": beef.id, "quantity_ordered": "5000"}]}
    response = api.post("/api/purchase-orders/", body)
    assert response.status_code == 201
    data = response.json()
    assert (data["status"], data["supplier_name"], data["allowed_actions"], data["can_receive"]) == (
        "draft", "Meat Co", ["send", "cancel"], False
    )
    line = data["lines"][0]
    assert line == {
        "id": line["id"], "ingredient": beef.id, "ingredient_name": "Beef", "unit": "g",
        "quantity_ordered": "5000.000", "quantity_received": "0.000", "quantity_outstanding": "5000.000",
    }
    assert data["created_at"].endswith("Z")


@pytest.mark.parametrize("lines", [
    [],
    [{"ingredient": "BEEF", "quantity_ordered": "0"}],
    [{"ingredient": "BEEF", "quantity_ordered": "1"}, {"ingredient": "BEEF", "quantity_ordered": "2"}],
])
def test_invalid_purchase_order_lines_rejected(api, supplier, beef, lines):
    for line in lines:
        line["ingredient"] = beef.id
    response = api.post("/api/purchase-orders/", {"request_id": "po-1", "supplier": supplier.id, "lines": lines})
    assert response.status_code == 400
    assert "lines" in response.json()
    assert not PurchaseOrder.objects.exists()


def test_unsupplied_ingredient_returns_409_and_creates_nothing(api, supplier, beef, lettuce):
    lines = [{"ingredient": beef.id, "quantity_ordered": "1"}, {"ingredient": lettuce.id, "quantity_ordered": "1"}]
    response = api.post("/api/purchase-orders/", {"request_id": "po-1", "supplier": supplier.id, "lines": lines})
    assert response.status_code == 409
    assert response.json() == {"code": "ingredient_not_supplied", "detail": "Meat Co does not supply: Lettuce."}
    assert not PurchaseOrder.objects.exists()


def test_list_newest_first(api, order, supplier):
    newer = PurchaseOrder.objects.create(request_id=new_id(), supplier=supplier)
    assert [o["id"] for o in api.get("/api/purchase-orders/").json()] == [newer.id, order.id]


def test_open_filter_returns_only_sent_and_received(api, order_in, supplier, beef):
    lines = [{"ingredient": beef, "quantity_ordered": Decimal("10")}]
    orders = {status: order_in(create_purchase_order(new_id(), supplier, lines)[0], status) for status in Status}
    listed = {o["id"]: o["status"] for o in api.get("/api/purchase-orders/?status=open").json()}
    assert listed == {orders[Status.SENT].id: "sent", orders[Status.RECEIVED].id: "received"}


def test_retrieve_and_unknown_id(api, order):
    assert api.get(url(order)).json()["id"] == order.id
    assert api.get("/api/purchase-orders/999999/").status_code == 404


def test_action_send(api, order):
    response = api.post(url(order, "actions/"), {"action": "send"})
    assert response.status_code == 200
    assert (response.json()["status"], response.json()["allowed_actions"]) == ("sent", ["cancel"])


@pytest.mark.parametrize("action", ["close", "deliver_full", "nonsense"])
def test_invalid_action_returns_409(api, order, action):
    response = api.post(url(order, "actions/"), {"action": action})
    assert response.status_code == 409
    assert response.json()["code"] == "invalid_transition"
    assert set(response.json()) == {"code", "detail"}


def test_action_requires_action_field(api, order):
    assert api.post(url(order, "actions/"), {}).status_code == 400


def test_action_on_unknown_order_is_404(api, db):
    assert api.post("/api/purchase-orders/999999/actions/", {"action": "send"}).status_code == 404


def test_receive_partial_delivery(api, sent_order, lines):
    body = {"request_id": "d-1", "lines": [{"line": lines["Beef"].id, "quantity": "3000"}]}
    response = api.post(url(sent_order, "deliveries/"), body)
    assert response.status_code == 201
    data = response.json()
    assert (data["status"], data["allowed_actions"], data["can_receive"]) == ("received", ["close"], True)
    beef_line = next(line for line in data["lines"] if line["id"] == lines["Beef"].id)
    assert (beef_line["quantity_received"], beef_line["quantity_outstanding"]) == ("3000.000", "2000.000")


def test_over_receipt_returns_409(api, sent_order, lines):
    body = {"request_id": "d-1", "lines": [{"line": lines["Bun"].id, "quantity": "101"}]}
    response = api.post(url(sent_order, "deliveries/"), body)
    assert (response.status_code, response.json()["code"]) == (409, "over_receipt")


def test_delivery_on_draft_returns_409(api, order, lines):
    body = {"request_id": "d-1", "lines": [{"line": lines["Bun"].id, "quantity": "1"}]}
    response = api.post(url(order, "deliveries/"), body)
    assert (response.status_code, response.json()["code"]) == (409, "po_not_receivable")


@pytest.mark.parametrize("make_lines", [
    lambda own, foreign: [],
    lambda own, foreign: [{"line": foreign, "quantity": "1"}],
    lambda own, foreign: [{"line": own, "quantity": "0"}],
    lambda own, foreign: [{"line": own, "quantity": "1"}, {"line": own, "quantity": "1"}],
])
def test_invalid_delivery_lines_rejected(api, sent_order, lines, supplier, beef, make_lines):
    other = PurchaseOrder.objects.create(request_id=new_id(), supplier=supplier)
    foreign = other.lines.create(ingredient=beef, quantity_ordered=1).id
    body = {"request_id": "d-1", "lines": make_lines(lines["Beef"].id, foreign)}
    response = api.post(url(sent_order, "deliveries/"), body)
    assert response.status_code == 400
    assert "lines" in response.json()


def test_delivery_on_unknown_order_is_404(api, db):
    body = {"request_id": "d-1", "lines": [{"line": 1, "quantity": "1"}]}
    assert api.post("/api/purchase-orders/999999/deliveries/", body).status_code == 404


def po_body(supplier, ingredient, quantity="5000", request_id="po-1"):
    return {"request_id": request_id, "supplier": supplier.id,
            "lines": [{"ingredient": ingredient.id, "quantity_ordered": quantity}]}


def test_repeated_purchase_order_request_returns_200_with_same_order(api, supplier, beef):
    first = api.post("/api/purchase-orders/", po_body(supplier, beef))
    again = api.post("/api/purchase-orders/", po_body(supplier, beef))
    assert (first.status_code, again.status_code) == (201, 200)
    assert again.json() == first.json()
    assert PurchaseOrder.objects.count() == 1


def test_reused_purchase_order_request_with_other_payload_returns_409(api, supplier, beef):
    api.post("/api/purchase-orders/", po_body(supplier, beef))
    response = api.post("/api/purchase-orders/", po_body(supplier, beef, quantity="1"))
    assert response.status_code == 409
    assert response.json() == {"code": "idempotency_conflict", "detail": response.json()["detail"]}


@pytest.mark.parametrize("request_id", [None, "", "x" * 65])
def test_purchase_order_request_id_is_validated(api, supplier, beef, request_id):
    body = po_body(supplier, beef, request_id=request_id)
    if request_id is None:
        del body["request_id"]
    response = api.post("/api/purchase-orders/", body)
    assert response.status_code == 400
    assert "request_id" in response.json()


def test_repeated_delivery_returns_200_and_applies_once(api, sent_order, lines, beef):
    body = {"request_id": "d-1", "lines": [{"line": lines["Beef"].id, "quantity": "3000"}]}
    first = api.post(url(sent_order, "deliveries/"), body)
    again = api.post(url(sent_order, "deliveries/"), body)
    assert (first.status_code, again.status_code) == (201, 200)
    assert again.json() == first.json()
    beef.refresh_from_db()
    assert beef.on_hand == Decimal("3000")


def test_reused_delivery_request_with_other_lines_returns_409(api, sent_order, lines):
    api.post(url(sent_order, "deliveries/"), {"request_id": "d-1", "lines": [{"line": lines["Beef"].id, "quantity": "1"}]})
    body = {"request_id": "d-1", "lines": [{"line": lines["Beef"].id, "quantity": "2"}]}
    response = api.post(url(sent_order, "deliveries/"), body)
    assert (response.status_code, response.json()["code"]) == (409, "idempotency_conflict")


def test_delivery_requires_request_id(api, sent_order, lines):
    response = api.post(url(sent_order, "deliveries/"), {"lines": [{"line": lines["Beef"].id, "quantity": "1"}]})
    assert response.status_code == 400
    assert "request_id" in response.json()
