import { useQuery } from "@tanstack/react-query";
import { createMenuItem, listMenuItems } from "../../api/menuItems";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";

export const menuItemKeys = { all: ["menu-items"] as const };

export function useMenuItems() {
  return useQuery({ queryKey: menuItemKeys.all, queryFn: listMenuItems });
}

export function useCreateMenuItem() {
  return useInvalidatingMutation(createMenuItem, [menuItemKeys.all]);
}
