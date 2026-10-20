import { get, post } from "./client";
import { catalogPath } from "./pagination";
import type { AddOn, AddOnInput, CatalogParams, Option, Page } from "./types";

export const listAddOns = (params: CatalogParams) => get<Page<AddOn>>(catalogPath("/add-ons/", params));
export const listAddOnOptions = () => get<Option[]>("/add-ons/options/");
export const createAddOn = (input: AddOnInput) => post<AddOn>("/add-ons/", input);
