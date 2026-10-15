from django.db import IntegrityError
from rest_framework import serializers

from core.errors import DomainError

ID_MAX_LENGTH = 64


class IdempotencyConflict(DomainError):
    def __init__(self):
        super().__init__(
            "idempotency_conflict", "This id was already used for a different request."
        )


def idempotency_key():
    return serializers.CharField(max_length=ID_MAX_LENGTH)


def create_once(find, create, matches):
    """Returns (result, created). `create` must run in its own atomic block and insert a row whose
    id is unique, so a concurrent duplicate fails with IntegrityError and resolves to the winner's row."""
    existing = find()
    if existing is None:
        try:
            return create(), True
        except IntegrityError:
            existing = find()
            if existing is None:
                raise
    if not matches(existing):
        raise IdempotencyConflict()
    return existing, False
