import { createAddOn, listAddOnOptions, listAddOns } from "../../api/addOns";
import { useRecipeOptions, type RecipeCatalog } from "../recipes/catalog";

export const addOnCatalog: RecipeCatalog = {
  key: "add-ons",
  list: listAddOns,
  options: listAddOnOptions,
  create: createAddOn,
};

export const useAddOnOptions = () => useRecipeOptions(addOnCatalog);
