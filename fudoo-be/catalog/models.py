from django.db import models
from django.db.models.functions import Lower

from core.quantities import QuantityField


class Unit(models.TextChoices):
    GRAM = "g"
    MILLILITRE = "ml"
    PIECE = "pcs"


EMPTY = 0
OUT_OF_STOCK = models.Q(on_hand=EMPTY)


class Ingredient(models.Model):
    name = models.CharField(max_length=100)
    unit = models.CharField(max_length=3, choices=Unit.choices)
    on_hand = QuantityField(default=0, editable=False)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["name"], name="ingredient_name")]
        constraints = [
            models.UniqueConstraint(Lower("name"), name="ingredient_name_ci_unique"),
            models.CheckConstraint(
                condition=models.Q(on_hand__gte=0), name="ingredient_on_hand_non_negative"
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def out_of_stock(self):
        return self.on_hand == EMPTY


class Supplier(models.Model):
    name = models.CharField(max_length=100, unique=True)
    contact = models.CharField(max_length=255, blank=True, default="")
    ingredients = models.ManyToManyField(
        Ingredient, through="SupplierItem", related_name="suppliers", blank=True
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class SupplierItem(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["supplier", "ingredient"], name="supplier_item_unique"),
        ]


class MenuItem(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class RecipeQuantity(models.Model):
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT, related_name="+")
    quantity = QuantityField()

    class Meta:
        abstract = True
        ordering = ["id"]


class RecipeLine(RecipeQuantity):
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name="recipe")

    class Meta(RecipeQuantity.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=["menu_item", "ingredient"], name="recipe_line_ingredient_unique"
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0), name="recipe_line_quantity_positive"
            ),
        ]


class AddOn(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class AddOnRecipeLine(RecipeQuantity):
    add_on = models.ForeignKey(AddOn, on_delete=models.CASCADE, related_name="recipe")

    class Meta(RecipeQuantity.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=["add_on", "ingredient"], name="add_on_recipe_line_ingredient_unique"
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0), name="add_on_recipe_line_quantity_positive"
            ),
        ]
