from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from core.errors import DomainError


def exception_handler(exc, context):
    if isinstance(exc, DomainError):
        return Response(exc.as_dict(), status=status.HTTP_409_CONFLICT)
    return drf_exception_handler(exc, context)
