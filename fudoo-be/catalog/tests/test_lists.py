import pytest

from catalog.models import Ingredient, Supplier
from conftest import build_burger
from core.testing import walk

pytestmark = pytest.mark.django_db


@pytest.fixture
def pantry(db):
    return Ingredient.objects.bulk_create(
        Ingredient(name=f"Item {n:03}", unit="g") for n in range(30)
    )


def names(response):
    return [row["name"] for row in response.json()["results"]]


def test_first_page_envelope_with_defaults(api, pantry):
    data = api.get("/api/ingredients/").json()
    assert (data["count"], len(data["results"]), data["previous"]) == (30, 25, None)
    assert data["next"] == "/api/ingredients/?page=2"
    assert data["results"][0] == {"id": pantry[0].id, "name": "Item 000", "unit": "g", "on_hand": "0.000", "out_of_stock": True}


def test_last_page_links_back_and_has_no_next(api, pantry):
    data = api.get("/api/ingredients/?page=3&page_size=10").json()
    assert (data["next"], data["previous"]) == (None, "/api/ingredients/?page=2&page_size=10")
    assert names(api.get("/api/ingredients/?page=3&page_size=10"))[0] == "Item 020"


def test_page_size_is_clamped_to_100(api, db):
    Ingredient.objects.bulk_create(Ingredient(name=f"Item {n:03}", unit="g") for n in range(101))
    data = api.get("/api/ingredients/?page_size=500").json()
    assert (len(data["results"]), data["next"]) == (100, "/api/ingredients/?page=2&page_size=500")


def test_walking_pages_returns_every_row_once(api, pantry):
    assert [row["name"] for row in walk(api, "/api/ingredients/?page_size=7")] == [p.name for p in pantry]


@pytest.mark.parametrize("path", ["/api/ingredients/", "/api/suppliers/", "/api/menu-items/"])
def test_page_past_end_is_404(api, db, path):
    response = api.get(f"{path}?page=2")
    assert response.status_code == 404
    assert response.json() == {"detail": "Invalid page."}


def test_empty_first_page_is_ok(api, db):
    assert api.get("/api/ingredients/").json() == {"count": 0, "next": None, "previous": None, "results": []}


@pytest.mark.parametrize("search", ["bU", "  BUN ", "un"])
def test_search_is_trimmed_case_insensitive_contains(api, beef, bun, search):
    assert names(api.get("/api/ingredients/", {"search": search})) == ["Bun"]


def test_blank_search_returns_everything(api, beef, bun):
    assert names(api.get("/api/ingredients/?search=%20%20")) == ["Beef", "Bun"]


def test_search_is_kept_in_links(api, pantry):
    assert api.get("/api/ingredients/?search=item&page_size=10").json()["next"] == (
        "/api/ingredients/?page=2&page_size=10&search=item"
    )


def test_search_suppliers_and_menu_items(api, supplier, burger, beef, bun):
    Supplier.objects.create(name="Veg Co")
    build_burger(beef, bun, "Veggie Wrap")
    assert names(api.get("/api/suppliers/?search=meat")) == ["Meat Co"]
    assert names(api.get("/api/menu-items/?search=WRAP")) == ["Veggie Wrap"]


@pytest.mark.parametrize("path", ["/api/ingredients/", "/api/suppliers/", "/api/menu-items/"])
def test_search_longer_than_100_is_400(api, db, path):
    assert api.get(path, {"search": "x" * 100}).status_code == 200
    response = api.get(path, {"search": "x" * 101})
    assert response.status_code == 400
    assert response.json() == {"search": ["Ensure this field has no more than 100 characters."]}


def test_stock_out_lists_only_empty_ingredients(api, beef, bun, lettuce, stock_up):
    stock_up((beef, "10"))
    assert names(api.get("/api/ingredients/?stock=out")) == ["Bun", "Lettuce"]
    assert names(api.get("/api/ingredients/?stock=out&search=lett")) == ["Lettuce"]


def test_out_of_stock_flag_follows_on_hand(api, beef, bun, stock_up):
    stock_up((beef, "0.001"))
    flags = {row["name"]: row["out_of_stock"] for row in api.get("/api/ingredients/").json()["results"]}
    assert flags == {"Beef": False, "Bun": True}


def test_out_of_stock_flag_is_read_only(api, db):
    response = api.post("/api/ingredients/", {"name": "Salt", "unit": "g", "out_of_stock": False})
    assert response.json()["out_of_stock"] is True


def test_unknown_stock_filter_is_400(api, db):
    response = api.get("/api/ingredients/?stock=low")
    assert (response.status_code, list(response.json())) == (400, ["stock"])


def test_summary_counts_total_and_out_of_stock(api, beef, bun, lettuce, stock_up):
    stock_up((beef, "10"))
    assert api.get("/api/ingredients/summary/").json() == {"total": 3, "in_stock": 1, "out_of_stock": 2}


def test_summary_of_empty_catalog(api, db):
    assert api.get("/api/ingredients/summary/").json() == {"total": 0, "in_stock": 0, "out_of_stock": 0}


def test_ingredient_options_are_ordered_names_with_unit(api, lettuce, bun, beef):
    assert api.get("/api/ingredients/options/").json() == [
        {"id": beef.id, "name": "Beef", "unit": "g"},
        {"id": bun.id, "name": "Bun", "unit": "pcs"},
        {"id": lettuce.id, "name": "Lettuce", "unit": "g"},
    ]


def test_ingredient_options_filtered_by_supplier(api, supplier, lettuce, beef, bun):
    Supplier.objects.create(name="Veg Co").ingredients.add(lettuce)
    options = api.get(f"/api/ingredients/options/?supplier={supplier.id}").json()
    assert [option["id"] for option in options] == [beef.id, bun.id]


def test_ingredient_options_for_unknown_supplier_are_empty(api, beef):
    assert api.get("/api/ingredients/options/?supplier=999999").json() == []


@pytest.mark.parametrize("supplier", ["abc", "0", "-1", str(10**30)])
def test_ingredient_options_reject_malformed_supplier(api, db, supplier):
    response = api.get(f"/api/ingredients/options/?supplier={supplier}")
    assert (response.status_code, list(response.json())) == (400, ["supplier"])


def test_supplier_and_menu_item_options(api, supplier, burger, beef, bun):
    veg = Supplier.objects.create(name="Aardvark Veg")
    wrap = build_burger(beef, bun, "A Wrap")
    assert api.get("/api/suppliers/options/").json() == [
        {"id": veg.id, "name": "Aardvark Veg"}, {"id": supplier.id, "name": "Meat Co"},
    ]
    assert api.get("/api/menu-items/options/").json() == [
        {"id": wrap.id, "name": "A Wrap"}, {"id": burger.id, "name": "Classic Burger"},
    ]


def test_options_are_not_paginated(api, pantry):
    assert len(api.get("/api/ingredients/options/").json()) == 30


def test_supplies_are_ordered_by_name(api, db):
    zest, apple = Ingredient.objects.create(name="Zest", unit="g"), Ingredient.objects.create(name="Apple", unit="g")
    response = api.post("/api/suppliers/", {"name": "Fruit Co", "ingredients": [zest.id, apple.id]})
    assert response.json()["supplies"] == [{"id": apple.id, "name": "Apple"}, {"id": zest.id, "name": "Zest"}]


def test_supplies_follow_patch(api, supplier, lettuce):
    response = api.patch(f"/api/suppliers/{supplier.id}/", {"ingredients": [lettuce.id]})
    assert response.json()["supplies"] == [{"id": lettuce.id, "name": "Lettuce"}]
    assert api.get("/api/suppliers/").json()["results"][0]["supplies"] == [{"id": lettuce.id, "name": "Lettuce"}]


def test_supplies_is_read_only(api, supplier, beef, bun):
    response = api.patch(f"/api/suppliers/{supplier.id}/", {"supplies": []})
    assert len(response.json()["supplies"]) == 2


def test_menu_items_paginate(api, beef, bun):
    for n in range(3):
        build_burger(beef, bun, f"Burger {n}")
    data = api.get("/api/menu-items/?page_size=2").json()
    assert (data["count"], names(api.get("/api/menu-items/?page=2&page_size=2"))) == (3, ["Burger 2"])
