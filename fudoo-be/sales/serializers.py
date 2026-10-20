from rest_framework import serializers

from catalog.models import AddOn, MenuItem
from core.idempotency import idempotency_key
from core.validation import MAX_LIST_ITEMS, PrimaryKeyField, fetch_all, reject_duplicates
from sales.models import Order, OrderLine, OrderLineAddOn

MAX_LINE_QUANTITY = 10000
MAX_ADD_ON_QUANTITY = 10
MAX_ADD_ONS_PER_LINE = 10


class OrderLineAddOnSerializer(serializers.ModelSerializer):
    add_on_name = serializers.CharField(source="add_on.name")

    class Meta:
        model = OrderLineAddOn
        fields = ["id", "add_on", "add_on_name", "quantity", "status", "shortages"]


class OrderLineSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source="menu_item.name")
    add_ons = OrderLineAddOnSerializer(many=True)

    class Meta:
        model = OrderLine
        fields = ["id", "menu_item", "menu_item_name", "quantity", "status", "shortages", "add_ons"]


class OrderSerializer(serializers.ModelSerializer):
    lines = OrderLineSerializer(many=True)

    class Meta:
        model = Order
        fields = ["id", "external_id", "status", "ordered_at", "lines"]


class AddOnChoiceSerializer(serializers.Serializer):
    add_on = PrimaryKeyField()
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_ADD_ON_QUANTITY)


class LineInputSerializer(serializers.Serializer):
    menu_item = PrimaryKeyField()
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_LINE_QUANTITY)
    add_ons = AddOnChoiceSerializer(many=True, required=False, max_length=MAX_ADD_ONS_PER_LINE)

    def validate_add_ons(self, add_ons):
        return reject_duplicates(add_ons, "add_on", "An add-on may appear only once per line.")


class OrderInputSerializer(serializers.Serializer):
    external_id = idempotency_key()
    lines = LineInputSerializer(many=True, allow_empty=False, max_length=MAX_LIST_ITEMS)

    def validate_lines(self, lines):
        menu_item_ids = [line["menu_item"] for line in lines]
        menu_items = fetch_all(MenuItem.objects.prefetch_related("recipe"), menu_item_ids)
        add_ons = fetch_all(AddOn.objects.prefetch_related("recipe"), _add_on_ids(lines))
        return [_resolved(line, menu_items, add_ons) for line in lines]


def _add_on_ids(lines):
    return [choice["add_on"] for line in lines for choice in line.get("add_ons", [])]


def _resolved(line, menu_items, add_ons):
    choices = [{**choice, "add_on": add_ons[choice["add_on"]]} for choice in line.get("add_ons", [])]
    return {**line, "menu_item": menu_items[line["menu_item"]], "add_ons": choices}
