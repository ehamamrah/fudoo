import pytest

from core.testing import new_id, walk
from purchasing.models import PurchaseOrder, Status

pytestmark = pytest.mark.django_db


@pytest.fixture
def add_orders(supplier):
    def add(count, status=Status.DRAFT):
        return [
            PurchaseOrder.objects.create(request_id=new_id(), supplier=supplier, status=status).id
            for _ in range(count)
        ]
    return add


def test_walk_returns_every_order_once_newest_first(api, add_orders):
    ids = add_orders(5)
    assert [row["id"] for row in walk(api, "/api/purchase-orders/?page_size=2")] == ids[::-1]


def test_open_walk_returns_only_open_orders_once(api, add_orders):
    add_orders(3)
    sent, received = add_orders(3, Status.SENT), add_orders(2, Status.RECEIVED)
    add_orders(2, Status.CLOSED)
    rows = walk(api, "/api/purchase-orders/?status=open&page_size=2")
    assert [row["id"] for row in rows] == (sent + received)[::-1]


def test_open_links_keep_the_filter(api, add_orders):
    add_orders(3, Status.SENT)
    link = api.get("/api/purchase-orders/?status=open&page_size=2").json()["next"]
    assert link.startswith("/api/purchase-orders/?") and "status=open" in link


def test_new_orders_mid_walk_do_not_shift_later_pages(api, add_orders):
    ids = add_orders(5)
    first = api.get("/api/purchase-orders/?page_size=2").json()
    add_orders(3)
    rest = walk(api, first["next"])
    assert [row["id"] for row in first["results"] + rest] == ids[::-1]


def test_default_page_size_is_25_without_count(api, add_orders):
    add_orders(26)
    data = api.get("/api/purchase-orders/").json()
    assert (len(data["results"]), sorted(data)) == (25, ["next", "previous", "results"])
