import { get, post } from "./client";
import type { MenuItem, MenuItemInput } from "./types";

export const listMenuItems = () => get<MenuItem[]>("/menu-items/");
export const createMenuItem = (input: MenuItemInput) => post<MenuItem>("/menu-items/", input);
