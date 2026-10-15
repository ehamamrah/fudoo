import pytest

from purchasing.models import PurchaseOrder, Status

pytestmark = pytest.mark.django_db


def url(order, suffix=""):
    return f"/api/purchase-orders/{order.id}/{suffix}"


def test_create_purchase_order_in_draft(api, supplier, beef):
    body = {"supplier": supplier.id, "lines": [{"ingredient": beef.id, "quantity_ordered": "5000"}]}
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
    response = api.post("/api/purchase-orders/", {"supplier": supplier.id, "lines": lines})
    assert response.status_code == 400
    assert "lines" in response.json()
    assert not PurchaseOrder.objects.exists()


def test_list_newest_first_and_open_filter(api, order, order_in, supplier, beef):
    newer = PurchaseOrder.objects.create(supplier=supplier)
    order_in(order, Status.SENT)
    assert [o["id"] for o in api.get("/api/purchase-orders/").json()] == [newer.id, order.id]
    assert [o["id"] for o in api.get("/api/purchase-orders/?status=open").json()] == [order.id]


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
    body = {"lines": [{"line": lines["Beef"].id, "quantity": "3000"}]}
    response = api.post(url(sent_order, "deliveries/"), body)
    assert response.status_code == 201
    data = response.json()
    assert (data["status"], data["allowed_actions"], data["can_receive"]) == ("received", ["close"], True)
    beef_line = next(line for line in data["lines"] if line["id"] == lines["Beef"].id)
    assert (beef_line["quantity_received"], beef_line["quantity_outstanding"]) == ("3000.000", "2000.000")


def test_over_receipt_returns_409(api, sent_order, lines):
    body = {"lines": [{"line": lines["Bun"].id, "quantity": "101"}]}
    response = api.post(url(sent_order, "deliveries/"), body)
    assert (response.status_code, response.json()["code"]) == (409, "over_receipt")


def test_delivery_on_draft_returns_409(api, order, lines):
    body = {"lines": [{"line": lines["Bun"].id, "quantity": "1"}]}
    response = api.post(url(order, "deliveries/"), body)
    assert (response.status_code, response.json()["code"]) == (409, "po_not_receivable")


@pytest.mark.parametrize("make_lines", [
    lambda own, foreign: [],
    lambda own, foreign: [{"line": foreign, "quantity": "1"}],
    lambda own, foreign: [{"line": own, "quantity": "0"}],
    lambda own, foreign: [{"line": own, "quantity": "1"}, {"line": own, "quantity": "1"}],
])
def test_invalid_delivery_lines_rejected(api, sent_order, lines, supplier, beef, make_lines):
    other = PurchaseOrder.objects.create(supplier=supplier)
    foreign = other.lines.create(ingredient=beef, quantity_ordered=1).id
    body = {"lines": make_lines(lines["Beef"].id, foreign)}
    response = api.post(url(sent_order, "deliveries/"), body)
    assert response.status_code == 400
    assert "lines" in response.json()


def test_delivery_on_unknown_order_is_404(api, db):
    body = {"lines": [{"line": 1, "quantity": "1"}]}
    assert api.post("/api/purchase-orders/999999/deliveries/", body).status_code == 404
