import { get, patch, post } from "./client";
import { catalogPath } from "./pagination";
import type { CatalogParams, Option, Page, Supplier, SupplierInput } from "./types";

export const listSuppliers = (params: CatalogParams) => get<Page<Supplier>>(catalogPath("/suppliers/", params));
export const listSupplierOptions = () => get<Option[]>("/suppliers/options/");
export const createSupplier = (input: SupplierInput) => post<Supplier>("/suppliers/", input);
export const updateSupplierIngredients = (id: number, ingredients: number[]) =>
  patch<Supplier>(`/suppliers/${id}/`, { ingredients });
