from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from purchasing import services
from purchasing.models import OPEN_STATUSES, PurchaseOrder
from purchasing.serializers import (
    ActionInputSerializer,
    DeliveryInputSerializer,
    PurchaseOrderInputSerializer,
    PurchaseOrderSerializer,
)


def _orders():
    return PurchaseOrder.objects.select_related("supplier").prefetch_related("lines__ingredient")


def _respond(order_id, code=status.HTTP_200_OK):
    return Response(PurchaseOrderSerializer(_orders().get(pk=order_id)).data, status=code)


def _created_or_replayed(order, created):
    return _respond(order.id, status.HTTP_201_CREATED if created else status.HTTP_200_OK)


def _validated(serializer_class, request, **context):
    serializer = serializer_class(data=request.data, context=context)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class PurchaseOrderListCreate(APIView):
    def get(self, request):
        orders = _orders()
        if request.query_params.get("status") == "open":
            orders = orders.filter(status__in=OPEN_STATUSES)
        return Response(PurchaseOrderSerializer(orders, many=True).data)

    def post(self, request):
        return _created_or_replayed(
            *services.create_purchase_order(**_validated(PurchaseOrderInputSerializer, request))
        )


class PurchaseOrderDetail(APIView):
    def get(self, request, pk):
        return Response(PurchaseOrderSerializer(get_object_or_404(_orders(), pk=pk)).data)


class PurchaseOrderActions(APIView):
    def post(self, request, pk):
        data = _validated(ActionInputSerializer, request)
        services.perform_action(pk, data["action"])
        return _respond(pk)


class PurchaseOrderDeliveries(APIView):
    def post(self, request, pk):
        order = get_object_or_404(PurchaseOrder, pk=pk)
        data = _validated(DeliveryInputSerializer, request, purchase_order=order)
        return _created_or_replayed(*services.receive_delivery(pk, data["request_id"], data["lines"]))
