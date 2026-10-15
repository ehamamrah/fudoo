from rest_framework import serializers

from catalog.models import MenuItem
from sales.models import Sale


class SaleSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)

    class Meta:
        model = Sale
        fields = ["id", "external_id", "menu_item", "menu_item_name", "quantity", "sold_at"]


class SaleInputSerializer(serializers.Serializer):
    external_id = serializers.CharField(max_length=100)
    menu_item = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.prefetch_related("recipe")
    )
    quantity = serializers.IntegerField(min_value=1)
