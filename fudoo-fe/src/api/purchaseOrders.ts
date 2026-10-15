import { get, post } from "./client";
import type {
  DeliveryInput,
  PurchaseOrder,
  PurchaseOrderAction,
  PurchaseOrderFilter,
  PurchaseOrderInput,
} from "./types";

const base = "/purchase-orders/";

export const listPurchaseOrders = (filter: PurchaseOrderFilter) =>
  get<PurchaseOrder[]>(filter === "open" ? `${base}?status=open` : base);

export const getPurchaseOrder = (id: number) => get<PurchaseOrder>(`${base}${id}/`);

export const createPurchaseOrder = (input: PurchaseOrderInput) => post<PurchaseOrder>(base, input);

export const runPurchaseOrderAction = (id: number, action: PurchaseOrderAction) =>
  post<PurchaseOrder>(`${base}${id}/actions/`, { action });

export const receiveDelivery = (id: number, input: DeliveryInput) =>
  post<PurchaseOrder>(`${base}${id}/deliveries/`, input);
