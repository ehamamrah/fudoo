from django.db import DatabaseError, connection
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

HEALTHY = {"status": "ok", "database": "ok"}
UNHEALTHY = {"status": "error", "database": "unavailable"}


@api_view(["GET"])
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        return Response(UNHEALTHY, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response(HEALTHY)
