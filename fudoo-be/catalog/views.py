from rest_framework import generics

from catalog.models import Ingredient, MenuItem, Supplier
from catalog.serializers import IngredientSerializer, MenuItemSerializer, SupplierSerializer


class IngredientListCreate(generics.ListCreateAPIView):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer


class SupplierListCreate(generics.ListCreateAPIView):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer


class MenuItemListCreate(generics.ListCreateAPIView):
    queryset = MenuItem.objects.prefetch_related("recipe__ingredient")
    serializer_class = MenuItemSerializer
