from rest_framework import serializers

from catalog import services
from catalog.models import Ingredient, MenuItem, RecipeLine, Supplier
from core.quantities import positive_quantity
from core.validation import (
    MAX_LIST_ITEMS,
    PrimaryKeyField,
    PrimaryKeyListField,
    reject_duplicates,
    resolve_references,
)


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ["id", "name", "unit", "on_hand"]

    def validate_name(self, value):
        if Ingredient.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("An ingredient with this name already exists.")
        return value


class SupplierSerializer(serializers.ModelSerializer):
    ingredients = PrimaryKeyListField(queryset=Ingredient.objects.all(), required=False)

    class Meta:
        model = Supplier
        fields = ["id", "name", "contact", "ingredients"]


class RecipeLineSerializer(serializers.ModelSerializer):
    ingredient = PrimaryKeyField()
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    unit = serializers.CharField(source="ingredient.unit", read_only=True)
    quantity = positive_quantity()

    class Meta:
        model = RecipeLine
        fields = ["ingredient", "ingredient_name", "unit", "quantity"]


class MenuItemSerializer(serializers.ModelSerializer):
    recipe = RecipeLineSerializer(many=True, allow_empty=False, max_length=MAX_LIST_ITEMS)

    class Meta:
        model = MenuItem
        fields = ["id", "name", "recipe"]

    def validate_recipe(self, recipe):
        reject_duplicates(recipe, "ingredient", "An ingredient may appear only once.")
        return resolve_references(recipe, "ingredient", Ingredient.objects.all())

    def create(self, validated_data):
        menu_item = services.create_menu_item(**validated_data)
        return MenuItem.objects.prefetch_related("recipe__ingredient").get(pk=menu_item.pk)
