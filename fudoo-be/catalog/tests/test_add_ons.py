import pytest

from catalog.models import AddOn
from conftest import build_add_on

pytestmark = pytest.mark.django_db


def test_create_add_on_with_recipe(api, cheddar):
    response = api.post("/api/add-ons/", {"name": "Extra cheese", "recipe": [{"ingredient": cheddar.id, "quantity": 1}]})
    assert response.status_code == 201
    assert response.json() == {
        "id": response.json()["id"], "name": "Extra cheese",
        "recipe": [{"ingredient": cheddar.id, "ingredient_name": "Cheddar", "unit": "pcs", "quantity": "1.000"}],
    }


@pytest.mark.parametrize("recipe", [
    [],
    [{"ingredient": "CHEDDAR", "quantity": "0"}],
    [{"ingredient": "CHEDDAR", "quantity": "-1"}],
    [{"ingredient": "CHEDDAR", "quantity": "1"}, {"ingredient": "CHEDDAR", "quantity": "2"}],
    [{"ingredient": 999999, "quantity": "1"}],
])
def test_invalid_add_on_recipe_is_rejected(api, cheddar, recipe):
    for line in recipe:
        line["ingredient"] = cheddar.id if line["ingredient"] == "CHEDDAR" else line["ingredient"]
    response = api.post("/api/add-ons/", {"name": "Extra cheese", "recipe": recipe})
    assert (response.status_code, list(response.json())) == (400, ["recipe"])
    assert not AddOn.objects.exists()


def test_unknown_ingredient_lists_the_id(api, db):
    response = api.post("/api/add-ons/", {"name": "Extra", "recipe": [{"ingredient": 999999, "quantity": "1"}]})
    assert response.json() == {"recipe": ["Unknown ids: [999999]."]}


def test_add_on_name_is_unique(api, extra_cheese, cheddar):
    body = {"name": "Extra cheese", "recipe": [{"ingredient": cheddar.id, "quantity": "1"}]}
    assert (api.post("/api/add-ons/", body).status_code, AddOn.objects.count()) == (400, 1)


def test_list_add_ons_ordered_by_name_with_search(api, extra_cheese, bun):
    build_add_on(bun, "2", "Double bun")
    data = api.get("/api/add-ons/").json()
    assert (data["count"], [row["name"] for row in data["results"]]) == (2, ["Double bun", "Extra cheese"])
    assert [row["name"] for row in api.get("/api/add-ons/?search=CHEE").json()["results"]] == ["Extra cheese"]


def test_add_ons_paginate(api, cheddar):
    for n in range(3):
        build_add_on(cheddar, "1", f"Extra {n}")
    data = api.get("/api/add-ons/?page=2&page_size=2").json()
    assert (data["count"], [row["name"] for row in data["results"]]) == (3, ["Extra 2"])
    assert data["previous"] == "/api/add-ons/?page_size=2"


def test_add_on_options_are_ordered_names(api, extra_cheese, bun):
    double = build_add_on(bun, "2", "Double bun")
    assert api.get("/api/add-ons/options/").json() == [
        {"id": double.id, "name": "Double bun"}, {"id": extra_cheese.id, "name": "Extra cheese"},
    ]
