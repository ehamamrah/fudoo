from rest_framework.exceptions import NotFound

from core.errors import DomainError
from core.exceptions import exception_handler


def test_domain_error_maps_to_409_with_code_detail_and_extra():
    response = exception_handler(DomainError("some_rule", "Broken.", hint=1), {})
    assert response.status_code == 409
    assert response.data == {"code": "some_rule", "detail": "Broken.", "hint": 1}


def test_other_errors_use_drf_default():
    response = exception_handler(NotFound(), {})
    assert response.status_code == 404
    assert response.data == {"detail": "Not found."}
