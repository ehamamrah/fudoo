import pytest
from django.db import OperationalError, connection

pytestmark = pytest.mark.django_db


def test_health_reports_ok(api):
    response = api.get("/api/health/")
    assert (response.status_code, response.json()) == (200, {"status": "ok", "database": "ok"})


def test_health_reports_unavailable_database(api, monkeypatch):
    def broken_cursor(*args, **kwargs):
        raise OperationalError("connection refused")
    monkeypatch.setattr(connection, "cursor", broken_cursor)
    response = api.get("/api/health/")
    assert (response.status_code, response.json()) == (503, {"status": "error", "database": "unavailable"})
