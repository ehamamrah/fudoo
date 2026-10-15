from rest_framework import filters, serializers

from catalog.models import OUT_OF_STOCK
from core.validation import PrimaryKeyField, validated_query

MAX_SEARCH_LENGTH = 100


class SearchQuery(serializers.Serializer):
    search = serializers.CharField(max_length=MAX_SEARCH_LENGTH, required=False, allow_blank=True)


class StockQuery(serializers.Serializer):
    stock = serializers.ChoiceField(choices=["out"], required=False)


class SupplierQuery(serializers.Serializer):
    supplier = PrimaryKeyField(required=False)


class NameSearchFilter(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        search = validated_query(SearchQuery, request).get("search")
        return queryset.filter(name__icontains=search) if search else queryset


class OutOfStockFilter(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        stock = validated_query(StockQuery, request).get("stock")
        return queryset.filter(OUT_OF_STOCK) if stock else queryset


class SupplierFilter(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        supplier = validated_query(SupplierQuery, request).get("supplier")
        return queryset if supplier is None else queryset.filter(suppliers__id=supplier)
