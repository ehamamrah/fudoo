import pytest

pytestmark = pytest.mark.django_db
SIZES = [1, 6]


@pytest.mark.parametrize("size", SIZES)
@pytest.mark.parametrize(("path", "queries"), [
    ("/api/ingredients/", 1),
    ("/api/suppliers/", 2),
    ("/api/menu-items/", 3),
])
def test_list_query_count_is_constant(api, kitchen, django_assert_num_queries, size, path, queries):
    for n in range(size):
        kitchen(size, f"k{n}")
    with django_assert_num_queries(queries):
        assert api.get(path).status_code == 200


@pytest.mark.parametrize("size", SIZES)
def test_supplier_detail_query_count_is_constant(api, kitchen, django_assert_num_queries, size):
    supplier = kitchen(size).supplier
    with django_assert_num_queries(2):
        assert len(api.get(f"/api/suppliers/{supplier.id}/").json()["ingredients"]) == size


@pytest.mark.parametrize("size", SIZES)
def test_create_menu_item_query_count_is_constant(api, kitchen, django_assert_num_queries, size):
    recipe = [{"ingredient": ingredient.id, "quantity": "1"} for ingredient in kitchen(size).ingredients]
    with django_assert_num_queries(9):
        assert api.post("/api/menu-items/", {"name": "New", "recipe": recipe}).status_code == 201


@pytest.mark.parametrize("size", SIZES)
def test_write_supplier_query_count_is_constant(api, kitchen, django_assert_num_queries, size):
    ids = [ingredient.id for ingredient in kitchen(size).ingredients]
    with django_assert_num_queries(7):
        supplier_id = api.post("/api/suppliers/", {"name": "New", "ingredients": ids}).json()["id"]
    with django_assert_num_queries(6):
        assert api.patch(f"/api/suppliers/{supplier_id}/", {"ingredients": []}).status_code == 200
