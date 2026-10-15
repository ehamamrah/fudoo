from rest_framework import generics, status
from rest_framework.response import Response

from core.pagination import CursorPagination
from sales.models import Sale
from sales.serializers import SaleInputSerializer, SaleSerializer
from sales.services import record_sale


class SaleListCreate(generics.ListAPIView):
    queryset = Sale.objects.select_related("menu_item")
    serializer_class = SaleSerializer
    pagination_class = CursorPagination

    def post(self, request):
        serializer = SaleInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale, created = record_sale(**serializer.validated_data)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(SaleSerializer(sale).data, status=code)
