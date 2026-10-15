from datetime import UTC, datetime

import pytest

from core.testing import walk
from sales.models import Sale

pytestmark = pytest.mark.django_db


@pytest.fixture
def add_sales(burger):
    def add(count, start=0):
        return [
            Sale.objects.create(external_id=f"pos-{n}", menu_item=burger, quantity=1).id
            for n in range(start, start + count)
        ]
    return add


def test_walk_returns_every_sale_once_newest_first(api, add_sales):
    ids = add_sales(7)
    assert [row["id"] for row in walk(api, "/api/sales/?page_size=3")] == ids[::-1]


def test_walk_with_identical_timestamps_returns_every_sale_once(api, add_sales):
    ids = add_sales(7)
    Sale.objects.update(sold_at=datetime(2026, 10, 15, tzinfo=UTC))
    assert [row["id"] for row in walk(api, "/api/sales/?page_size=3")] == ids[::-1]


def test_new_sales_mid_walk_do_not_shift_later_pages(api, add_sales):
    ids = add_sales(6)
    first = api.get("/api/sales/?page_size=2").json()
    add_sales(3, start=100)
    rest = walk(api, first["next"])
    assert [row["id"] for row in first["results"] + rest] == ids[::-1]


def test_previous_link_returns_the_earlier_page(api, add_sales):
    add_sales(5)
    first = api.get("/api/sales/?page_size=2").json()
    second = api.get(first["next"]).json()
    assert second["previous"].startswith("/api/sales/?")
    assert api.get(second["previous"]).json()["results"] == first["results"]


def test_page_size_is_clamped_to_100(api, add_sales):
    add_sales(101)
    data = api.get("/api/sales/?page_size=1000").json()
    assert (len(data["results"]), data["previous"]) == (100, None)
    assert data["next"].startswith("/api/sales/?cursor=")


def test_last_page_has_no_next(api, add_sales):
    add_sales(2)
    assert api.get("/api/sales/").json()["next"] is None


def test_invalid_cursor_is_404(api, db):
    response = api.get("/api/sales/?cursor=garbage")
    assert (response.status_code, response.json()) == (404, {"detail": "Invalid cursor"})
