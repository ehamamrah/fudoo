import { RecipeCatalogPage, type RecipeCatalogLabels } from "../recipes/RecipeCatalogPage";
import { addOnCatalog } from "./hooks";

const labels: RecipeCatalogLabels = {
  title: "Add-ons",
  description: "Extras attached to an order line and the recipe each one uses from stock.",
  search: "Search add-ons",
  form: { title: "New add-on", recipe: "Recipe (per unit)", submit: "Add add-on" },
};

export function AddOnsPage() {
  return <RecipeCatalogPage catalog={addOnCatalog} labels={labels} />;
}
