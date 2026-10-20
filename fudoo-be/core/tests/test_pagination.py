import pytest

from core.pagination import relative


@pytest.mark.parametrize(("url", "expected"), [
    ("http://be:8000/api/orders/?cursor=abc&page_size=2", "/api/orders/?cursor=abc&page_size=2"),
    ("https://example.test/api/ingredients/?page=2", "/api/ingredients/?page=2"),
    ("http://be:8000/api/ingredients/", "/api/ingredients/"),
    (None, None),
])
def test_relative_drops_scheme_and_host(url, expected):
    assert relative(url) == expected
