import { createMenuItem, listMenuItemOptions, listMenuItems } from "../../api/menuItems";
import { useRecipeOptions, type RecipeCatalog } from "../recipes/catalog";

export const menuItemCatalog: RecipeCatalog = {
  key: "menu-items",
  list: listMenuItems,
  options: listMenuItemOptions,
  create: createMenuItem,
};

export const useMenuItemOptions = () => useRecipeOptions(menuItemCatalog);
