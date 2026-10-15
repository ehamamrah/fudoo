import pytest

from catalog.models import MenuItem

pytestmark = pytest.mark.django_db


def test_create_ingredient_starts_with_zero_stock(api):
    response = api.post("/api/ingredients/", {"name": "Beef", "unit": "g"})
    assert response.status_code == 201
    assert response.json() == {"id": response.json()["id"], "name": "Beef", "unit": "g", "on_hand": "0.000"}


def test_ingredient_on_hand_is_read_only(api):
    response = api.post("/api/ingredients/", {"name": "Beef", "unit": "g", "on_hand": "50"})
    assert response.json()["on_hand"] == "0.000"


def test_ingredient_unit_must_be_known(api):
    response = api.post("/api/ingredients/", {"name": "Beef", "unit": "kg"})
    assert response.status_code == 400
    assert "unit" in response.json()


def test_ingredient_name_is_unique_case_insensitive(api, beef):
    response = api.post("/api/ingredients/", {"name": "BEEF", "unit": "g"})
    assert response.status_code == 400
    assert "name" in response.json()


def test_list_ingredients_ordered_by_name(api, beef, bun):
    names = [item["name"] for item in api.get("/api/ingredients/").json()]
    assert names == ["Beef", "Bun"]


def test_create_and_list_suppliers(api):
    api.post("/api/suppliers/", {"name": "Veg Co"})
    created = api.post("/api/suppliers/", {"name": "Meat Co", "contact": "orders@meatco.test"})
    assert created.status_code == 201
    assert created.json()["contact"] == "orders@meatco.test"
    assert [s["name"] for s in api.get("/api/suppliers/").json()] == ["Meat Co", "Veg Co"]


def test_supplier_name_is_unique(api, supplier):
    assert api.post("/api/suppliers/", {"name": "Meat Co"}).status_code == 400


def test_create_menu_item_with_recipe(api, beef, bun):
    body = {"name": "Classic Burger", "recipe": [
        {"ingredient": beef.id, "quantity": "150"},
        {"ingredient": bun.id, "quantity": 1},
    ]}
    response = api.post("/api/menu-items/", body)
    assert response.status_code == 201
    assert response.json()["recipe"] == [
        {"ingredient": beef.id, "ingredient_name": "Beef", "unit": "g", "quantity": "150.000"},
        {"ingredient": bun.id, "ingredient_name": "Bun", "unit": "pcs", "quantity": "1.000"},
    ]


@pytest.mark.parametrize("recipe", [
    [],
    [{"ingredient": "BEEF", "quantity": "0"}],
    [{"ingredient": "BEEF", "quantity": "-1"}],
    [{"ingredient": "BEEF", "quantity": "1"}, {"ingredient": "BEEF", "quantity": "2"}],
    [{"ingredient": 999999, "quantity": "1"}],
])
def test_invalid_recipe_is_rejected(api, beef, recipe):
    for line in recipe:
        line["ingredient"] = beef.id if line["ingredient"] == "BEEF" else line["ingredient"]
    response = api.post("/api/menu-items/", {"name": "Classic Burger", "recipe": recipe})
    assert response.status_code == 400
    assert "recipe" in response.json()
    assert not MenuItem.objects.exists()


def test_menu_item_name_is_unique(api, burger, beef):
    body = {"name": "Classic Burger", "recipe": [{"ingredient": beef.id, "quantity": "1"}]}
    assert api.post("/api/menu-items/", body).status_code == 400


def test_list_menu_items(api, burger):
    items = api.get("/api/menu-items/").json()
    assert [item["name"] for item in items] == ["Classic Burger"]
    assert len(items[0]["recipe"]) == 2
