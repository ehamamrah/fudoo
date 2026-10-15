from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from sales.models import Sale
from sales.serializers import SaleInputSerializer, SaleSerializer
from sales.services import record_sale

LATEST_LIMIT = 50


class SaleListCreate(APIView):
    def get(self, request):
        sales = Sale.objects.select_related("menu_item")[:LATEST_LIMIT]
        return Response(SaleSerializer(sales, many=True).data)

    def post(self, request):
        serializer = SaleInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale, created = record_sale(**serializer.validated_data)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(SaleSerializer(sale).data, status=code)
