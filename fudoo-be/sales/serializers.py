from rest_framework import serializers

from catalog.models import MenuItem
from core.idempotency import idempotency_key
from sales.models import Sale

MAX_SALE_QUANTITY = 10000


class SaleSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)

    class Meta:
        model = Sale
        fields = ["id", "external_id", "menu_item", "menu_item_name", "quantity", "sold_at"]


class SaleInputSerializer(serializers.Serializer):
    external_id = idempotency_key()
    menu_item = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.prefetch_related("recipe")
    )
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_SALE_QUANTITY)
