from rest_framework import generics, status
from rest_framework.response import Response

from core.pagination import CursorPagination
from sales.models import Order
from sales.serializers import OrderInputSerializer, OrderSerializer
from sales.services import record_order


class OrderListCreate(generics.ListAPIView):
    queryset = Order.objects.with_lines()
    serializer_class = OrderSerializer
    pagination_class = CursorPagination

    def post(self, request):
        serializer = OrderInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order, created = record_order(**serializer.validated_data)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(OrderSerializer(order).data, status=code)
