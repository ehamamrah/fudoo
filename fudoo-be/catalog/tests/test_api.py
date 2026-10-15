import pytest

from catalog.models import MenuItem, Supplier

pytestmark = pytest.mark.django_db


def test_create_ingredient_starts_with_zero_stock(api):
    response = api.post("/api/ingredients/", {"name": "Beef", "unit": "g"})
    assert response.status_code == 201
    assert response.json() == {"id": response.json()["id"], "name": "Beef", "unit": "g", "on_hand": "0.000", "out_of_stock": True}


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
    names = [item["name"] for item in api.get("/api/ingredients/").json()["results"]]
    assert names == ["Beef", "Bun"]


def test_create_and_list_suppliers(api):
    api.post("/api/suppliers/", {"name": "Veg Co"})
    created = api.post("/api/suppliers/", {"name": "Meat Co", "contact": "orders@meatco.test"})
    assert created.status_code == 201
    assert created.json()["contact"] == "orders@meatco.test"
    assert [s["name"] for s in api.get("/api/suppliers/").json()["results"]] == ["Meat Co", "Veg Co"]


def test_supplier_name_is_unique(api, supplier):
    assert api.post("/api/suppliers/", {"name": "Meat Co"}).status_code == 400


def supplier_url(supplier_id):
    return f"/api/suppliers/{supplier_id}/"


def test_create_supplier_without_ingredients_defaults_to_empty(api):
    response = api.post("/api/suppliers/", {"name": "Veg Co"})
    assert response.status_code == 201
    assert response.json()["ingredients"] == []


def test_create_supplier_with_ingredients(api, beef, bun):
    body = {"name": "Veg Co", "contact": "", "ingredients": [beef.id, bun.id]}
    response = api.post("/api/suppliers/", body, format="json")
    assert response.status_code == 201
    assert response.json() == {
        "id": response.json()["id"], "name": "Veg Co", "contact": "", "ingredients": [beef.id, bun.id],
        "supplies": [{"id": beef.id, "name": "Beef"}, {"id": bun.id, "name": "Bun"}],
    }


def test_create_supplier_with_unknown_ingredient_is_400(api):
    response = api.post("/api/suppliers/", {"name": "Veg Co", "ingredients": [999999]}, format="json")
    assert response.status_code == 400
    assert "ingredients" in response.json()
    assert not Supplier.objects.exists()


def test_list_suppliers_shows_ingredient_ids(api, supplier, beef, bun):
    assert api.get("/api/suppliers/").json()["results"][0]["ingredients"] == [beef.id, bun.id]


def test_retrieve_supplier(api, supplier, beef, bun):
    response = api.get(supplier_url(supplier.id))
    assert response.status_code == 200
    assert response.json() == {
        "id": supplier.id, "name": "Meat Co", "contact": "orders@meatco.test", "ingredients": [beef.id, bun.id],
        "supplies": [{"id": beef.id, "name": "Beef"}, {"id": bun.id, "name": "Bun"}],
    }


def test_patch_replaces_ingredient_set(api, supplier, bun, lettuce):
    response = api.patch(supplier_url(supplier.id), {"ingredients": [lettuce.id]}, format="json")
    assert response.status_code == 200
    assert response.json()["ingredients"] == [lettuce.id]
    assert list(supplier.ingredients.all()) == [lettuce]


def test_patch_without_ingredients_keeps_set(api, supplier, beef, bun):
    response = api.patch(supplier_url(supplier.id), {"contact": "new@meatco.test"}, format="json")
    assert (response.json()["contact"], response.json()["ingredients"]) == ("new@meatco.test", [beef.id, bun.id])


def test_patch_with_unknown_ingredient_is_400_and_keeps_set(api, supplier, beef, bun):
    response = api.patch(supplier_url(supplier.id), {"ingredients": [999999]}, format="json")
    assert response.status_code == 400
    assert set(supplier.ingredients.all()) == {beef, bun}


def test_unknown_supplier_is_404(api, db):
    assert api.get(supplier_url(999999)).status_code == 404
    assert api.patch(supplier_url(999999), {"name": "X"}, format="json").status_code == 404


@pytest.mark.parametrize("method", ["put", "delete"])
def test_supplier_put_and_delete_not_allowed(api, supplier, method):
    assert getattr(api, method)(supplier_url(supplier.id)).status_code == 405


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
    items = api.get("/api/menu-items/").json()["results"]
    assert [item["name"] for item in items] == ["Classic Burger"]
    assert len(items[0]["recipe"]) == 2
