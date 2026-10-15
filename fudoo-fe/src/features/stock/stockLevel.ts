import type { Ingredient, MenuItem } from "../../api/types";
import { isLessThan, isZero } from "../../lib/quantity";

export type StockLevel = "out" | "low" | "ok";

export function menuItemsShortOf(ingredient: Ingredient, menuItems: MenuItem[]): string[] {
  return menuItems
    .filter((item) => item.recipe.some((line) =>
      line.ingredient === ingredient.id && isLessThan(ingredient.on_hand, line.quantity)))
    .map((item) => item.name);
}

export function stockLevel(ingredient: Ingredient, menuItems: MenuItem[]): StockLevel {
  if (isZero(ingredient.on_hand)) return "out";
  return menuItemsShortOf(ingredient, menuItems).length > 0 ? "low" : "ok";
}
