from datetime import UTC, datetime

import pytest

from core.testing import walk
from sales.models import Order, OrderLine

pytestmark = pytest.mark.django_db


@pytest.fixture
def add_orders(burger):
    def add(count, start=0):
        orders = Order.objects.bulk_create(
            Order(external_id=f"pos-{n}", status="completed") for n in range(start, start + count)
        )
        OrderLine.objects.bulk_create(
            OrderLine(order=order, menu_item=burger, quantity=1, status="fulfilled") for order in orders
        )
        return [order.id for order in orders]
    return add


def ids(rows):
    return [row["id"] for row in rows]


def test_walk_returns_every_order_once_newest_first(api, add_orders):
    created = add_orders(7)
    Order.objects.update(ordered_at=datetime(2026, 10, 20, tzinfo=UTC))
    for order_id in created:
        Order.objects.filter(pk=order_id).update(ordered_at=datetime(2026, 10, 20, 0, 0, order_id % 60, tzinfo=UTC))
    assert ids(walk(api, "/api/orders/?page_size=3")) == sorted(created, key=lambda pk: (pk % 60, pk))[::-1]


def test_walk_with_identical_timestamps_returns_every_order_once(api, add_orders):
    created = add_orders(7)
    Order.objects.update(ordered_at=datetime(2026, 10, 20, tzinfo=UTC))
    assert ids(walk(api, "/api/orders/?page_size=3")) == created[::-1]


def test_new_orders_mid_walk_do_not_shift_later_pages(api, add_orders):
    created = add_orders(6)
    first = api.get("/api/orders/?page_size=2").json()
    add_orders(3, start=100)
    assert ids(first["results"] + walk(api, first["next"])) == created[::-1]


def test_previous_link_returns_the_earlier_page(api, add_orders):
    add_orders(5)
    first = api.get("/api/orders/?page_size=2").json()
    second = api.get(first["next"]).json()
    assert second["previous"].startswith("/api/orders/?")
    assert api.get(second["previous"]).json()["results"] == first["results"]


def test_page_size_is_clamped_to_100(api, add_orders):
    add_orders(101)
    data = api.get("/api/orders/?page_size=1000").json()
    assert (len(data["results"]), data["previous"]) == (100, None)
    assert data["next"].startswith("/api/orders/?cursor=")


def test_last_page_has_no_next(api, add_orders):
    add_orders(2)
    assert api.get("/api/orders/").json()["next"] is None


def test_invalid_cursor_is_404(api, db):
    response = api.get("/api/orders/?cursor=garbage")
    assert (response.status_code, response.json()) == (404, {"detail": "Invalid cursor"})
