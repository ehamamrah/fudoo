import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createMenuItem, listMenuItemOptions, listMenuItems } from "../../api/menuItems";
import type { CatalogParams } from "../../api/types";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";

const menuItemKeys = {
  all: ["menu-items"] as const,
  list: (params: CatalogParams) => ["menu-items", "list", params] as const,
  options: ["menu-items", "options"] as const,
};

export function useMenuItemPage(params: CatalogParams) {
  return useQuery({ queryKey: menuItemKeys.list(params), queryFn: () => listMenuItems(params), placeholderData: keepPreviousData });
}

export function useMenuItemOptions() {
  return useQuery({ queryKey: menuItemKeys.options, queryFn: listMenuItemOptions });
}

export function useCreateMenuItem() {
  return useInvalidatingMutation(createMenuItem, [menuItemKeys.all]);
}
