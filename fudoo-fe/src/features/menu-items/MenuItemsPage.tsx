import { RecipeCatalogPage, type RecipeCatalogLabels } from "../recipes/RecipeCatalogPage";
import { menuItemCatalog } from "./hooks";

const labels: RecipeCatalogLabels = {
  title: "Menu items",
  description: "Dishes and the recipe each one uses from stock.",
  search: "Search menu items",
  form: { title: "New menu item", recipe: "Recipe (per portion)", submit: "Add menu item" },
};

export function MenuItemsPage() {
  return <RecipeCatalogPage catalog={menuItemCatalog} labels={labels} />;
}
