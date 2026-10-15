import { get, post, withQuery } from "./client";
import type { CursorPage, Sale, SaleInput } from "./types";

export const listSales = (cursor: string | null) => get<CursorPage<Sale>>(withQuery("/sales/", { cursor }));
export const createSale = (input: SaleInput) => post<Sale>("/sales/", input);
