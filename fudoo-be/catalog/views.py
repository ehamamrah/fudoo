from rest_framework import generics

from catalog.models import Ingredient, MenuItem, Supplier
from catalog.serializers import IngredientSerializer, MenuItemSerializer, SupplierSerializer


class IngredientListCreate(generics.ListCreateAPIView):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer


class SupplierListCreate(generics.ListCreateAPIView):
    queryset = Supplier.objects.prefetch_related("ingredients")
    serializer_class = SupplierSerializer


class SupplierDetail(generics.RetrieveUpdateAPIView):
    queryset = Supplier.objects.prefetch_related("ingredients")
    serializer_class = SupplierSerializer
    http_method_names = ["get", "patch", "head", "options"]


class MenuItemListCreate(generics.ListCreateAPIView):
    queryset = MenuItem.objects.prefetch_related("recipe__ingredient")
    serializer_class = MenuItemSerializer
