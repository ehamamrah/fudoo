import { get, patch, post } from "./client";
import type { Supplier, SupplierInput } from "./types";

export const listSuppliers = () => get<Supplier[]>("/suppliers/");
export const createSupplier = (input: SupplierInput) => post<Supplier>("/suppliers/", input);
export const updateSupplierIngredients = (id: number, ingredients: number[]) =>
  patch<Supplier>(`/suppliers/${id}/`, { ingredients });
