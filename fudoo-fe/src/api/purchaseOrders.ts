import { get, post, withQuery } from "./client";
import type {
  CursorPage,
  DeliveryInput,
  PurchaseOrder,
  PurchaseOrderAction,
  PurchaseOrderFilter,
  PurchaseOrderInput,
} from "./types";

const base = "/purchase-orders/";

export const listPurchaseOrders = (filter: PurchaseOrderFilter, cursor: string | null) =>
  get<CursorPage<PurchaseOrder>>(withQuery(base, { status: filter === "open" ? "open" : null, cursor }));

export const getPurchaseOrder = (id: number) => get<PurchaseOrder>(`${base}${id}/`);

export const createPurchaseOrder = (input: PurchaseOrderInput) => post<PurchaseOrder>(base, input);

export const runPurchaseOrderAction = (id: number, action: PurchaseOrderAction) =>
  post<PurchaseOrder>(`${base}${id}/actions/`, { action });

export const receiveDelivery = (id: number, input: DeliveryInput) =>
  post<PurchaseOrder>(`${base}${id}/deliveries/`, input);
