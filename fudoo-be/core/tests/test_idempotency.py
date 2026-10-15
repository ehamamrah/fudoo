import pytest
from django.db import IntegrityError

from core.idempotency import IdempotencyConflict, create_once


def fail(error):
    raise error


def test_creates_when_nothing_exists():
    assert create_once(lambda: None, lambda: "new", lambda _: True) == ("new", True)


def test_returns_existing_when_payload_matches():
    assert create_once(lambda: "old", lambda: fail(AssertionError()), lambda _: True) == ("old", False)


def test_conflicts_when_payload_differs():
    with pytest.raises(IdempotencyConflict) as error:
        create_once(lambda: "old", lambda: "new", lambda _: False)
    assert error.value.code == "idempotency_conflict"


def test_lost_race_resolves_to_winner():
    finds = iter([None, "winner"])
    outcome = create_once(lambda: next(finds), lambda: fail(IntegrityError()), lambda _: True)
    assert outcome == ("winner", False)


def test_unrelated_integrity_error_propagates():
    with pytest.raises(IntegrityError):
        create_once(lambda: None, lambda: fail(IntegrityError()), lambda _: True)
