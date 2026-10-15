import { get, post } from "./client";
import type { Sale, SaleInput } from "./types";

export const listSales = () => get<Sale[]>("/sales/");
export const createSale = (input: SaleInput) => post<Sale>("/sales/", input);
