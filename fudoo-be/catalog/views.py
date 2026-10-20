from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from catalog import services
from catalog.filters import NameSearchFilter, OutOfStockFilter, SupplierFilter
from catalog.models import AddOn, Ingredient, MenuItem, Supplier
from catalog.serializers import (
    AddOnSerializer,
    IngredientSerializer,
    MenuItemSerializer,
    SupplierSerializer,
)


class IngredientListCreate(generics.ListCreateAPIView):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    filter_backends = [NameSearchFilter, OutOfStockFilter]


class SupplierListCreate(generics.ListCreateAPIView):
    queryset = Supplier.objects.prefetch_related("ingredients")
    serializer_class = SupplierSerializer
    filter_backends = [NameSearchFilter]


class SupplierDetail(generics.RetrieveUpdateAPIView):
    queryset = Supplier.objects.prefetch_related("ingredients")
    serializer_class = SupplierSerializer
    http_method_names = ["get", "patch", "head", "options"]


class MenuItemListCreate(generics.ListCreateAPIView):
    queryset = MenuItem.objects.prefetch_related("recipe__ingredient")
    serializer_class = MenuItemSerializer
    filter_backends = [NameSearchFilter]


class AddOnListCreate(generics.ListCreateAPIView):
    queryset = AddOn.objects.prefetch_related("recipe__ingredient")
    serializer_class = AddOnSerializer
    filter_backends = [NameSearchFilter]


class Options(generics.GenericAPIView):
    fields = ("id", "name")

    def get(self, request):
        return Response(list(self.filter_queryset(self.get_queryset()).values(*self.fields)))


class IngredientOptions(Options):
    queryset = Ingredient.objects.all()
    fields = ("id", "name", "unit")
    filter_backends = [SupplierFilter]


class SupplierOptions(Options):
    queryset = Supplier.objects.all()


class MenuItemOptions(Options):
    queryset = MenuItem.objects.all()


class AddOnOptions(Options):
    queryset = AddOn.objects.all()


@api_view(["GET"])
def ingredient_summary(request):
    return Response(services.stock_summary())
