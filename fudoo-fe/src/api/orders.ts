import { get, post, withQuery } from "./client";
import type { CursorPage, Order, OrderInput } from "./types";

export const listOrders = (cursor: string | null) => get<CursorPage<Order>>(withQuery("/orders/", { cursor }));
export const createOrder = (input: OrderInput) => post<Order>("/orders/", input);
