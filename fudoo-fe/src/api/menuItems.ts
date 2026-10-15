import { get, post } from "./client";
import { catalogPath } from "./pagination";
import type { CatalogParams, MenuItem, MenuItemInput, Option, Page } from "./types";

export const listMenuItems = (params: CatalogParams) => get<Page<MenuItem>>(catalogPath("/menu-items/", params));
export const listMenuItemOptions = () => get<Option[]>("/menu-items/options/");
export const createMenuItem = (input: MenuItemInput) => post<MenuItem>("/menu-items/", input);
