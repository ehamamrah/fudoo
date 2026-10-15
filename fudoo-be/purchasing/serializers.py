from rest_framework import serializers

from catalog.models import Ingredient, Supplier
from core.quantities import DECIMAL_PLACES, MAX_DIGITS, positive_quantity
from core.validation import reject_duplicates
from purchasing import state_machine
from purchasing.models import POLine, PurchaseOrder


class POLineSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    unit = serializers.CharField(source="ingredient.unit", read_only=True)
    quantity_outstanding = serializers.DecimalField(
        max_digits=MAX_DIGITS, decimal_places=DECIMAL_PLACES, read_only=True
    )

    class Meta:
        model = POLine
        fields = [
            "id", "ingredient", "ingredient_name", "unit",
            "quantity_ordered", "quantity_received", "quantity_outstanding",
        ]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    lines = POLineSerializer(many=True, read_only=True)
    allowed_actions = serializers.SerializerMethodField()
    can_receive = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = ["id", "supplier", "supplier_name", "status", "created_at", "lines", "allowed_actions", "can_receive"]

    def get_allowed_actions(self, order):
        return state_machine.allowed_actions(order.status)

    def get_can_receive(self, order):
        return state_machine.can_receive(order.status)


class POLineInputSerializer(serializers.Serializer):
    ingredient = serializers.PrimaryKeyRelatedField(queryset=Ingredient.objects.all())
    quantity_ordered = positive_quantity()


class PurchaseOrderInputSerializer(serializers.Serializer):
    supplier = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all())
    lines = POLineInputSerializer(many=True, allow_empty=False)

    def validate_lines(self, lines):
        return reject_duplicates(lines, "ingredient", "An ingredient may appear only once.")


class ActionInputSerializer(serializers.Serializer):
    action = serializers.CharField()


class DeliveryLineInputSerializer(serializers.Serializer):
    line = serializers.IntegerField()
    quantity = positive_quantity()


class DeliveryInputSerializer(serializers.Serializer):
    lines = DeliveryLineInputSerializer(many=True, allow_empty=False)

    def validate_lines(self, lines):
        reject_duplicates(lines, "line", "A line may appear only once.")
        own_lines = set(self.context["purchase_order"].lines.values_list("id", flat=True))
        if any(item["line"] not in own_lines for item in lines):
            raise serializers.ValidationError("Every line must belong to this purchase order.")
        return lines
