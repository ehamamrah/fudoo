import { get, post } from "./client";
import type { Supplier, SupplierInput } from "./types";

export const listSuppliers = () => get<Supplier[]>("/suppliers/");
export const createSupplier = (input: SupplierInput) => post<Supplier>("/suppliers/", input);
