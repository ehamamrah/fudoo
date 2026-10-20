from django.db.models import prefetch_related_objects
from rest_framework import serializers

from catalog import services
from catalog.models import AddOn, Ingredient, MenuItem, Supplier
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
        fields = ["id", "name", "unit", "on_hand", "out_of_stock"]
        read_only_fields = ["out_of_stock"]

    def validate_name(self, value):
        if Ingredient.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("An ingredient with this name already exists.")
        return value


class IngredientNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ["id", "name"]


class SupplierSerializer(serializers.ModelSerializer):
    ingredients = PrimaryKeyListField(queryset=Ingredient.objects.all(), required=False)
    supplies = IngredientNameSerializer(source="ingredients", many=True, read_only=True)

    class Meta:
        model = Supplier
        fields = ["id", "name", "contact", "ingredients", "supplies"]

    def to_representation(self, instance):
        prefetch_related_objects([instance], "ingredients")
        return super().to_representation(instance)


class RecipeLineSerializer(serializers.Serializer):
    ingredient = PrimaryKeyField()
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    unit = serializers.CharField(source="ingredient.unit", read_only=True)
    quantity = positive_quantity()


class WithRecipeSerializer(serializers.ModelSerializer):
    recipe = RecipeLineSerializer(many=True, allow_empty=False, max_length=MAX_LIST_ITEMS)

    def validate_recipe(self, recipe):
        reject_duplicates(recipe, "ingredient", "An ingredient may appear only once.")
        return resolve_references(recipe, "ingredient", Ingredient.objects.all())

    def create(self, validated_data):
        owner = self.create_with_recipe(**validated_data)
        return self.Meta.model.objects.prefetch_related("recipe__ingredient").get(pk=owner.pk)


class MenuItemSerializer(WithRecipeSerializer):
    create_with_recipe = staticmethod(services.create_menu_item)

    class Meta:
        model = MenuItem
        fields = ["id", "name", "recipe"]


class AddOnSerializer(WithRecipeSerializer):
    create_with_recipe = staticmethod(services.create_add_on)

    class Meta:
        model = AddOn
        fields = ["id", "name", "recipe"]
