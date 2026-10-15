import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  receiveDelivery,
  runPurchaseOrderAction,
} from "../../api/purchaseOrders";
import type { DeliveryInput, PurchaseOrderAction, PurchaseOrderFilter } from "../../api/types";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";
import { POLL_INTERVAL_MS } from "../../queryClient";
import { stockKeys } from "../ingredients/hooks";

const purchaseOrderKeys = {
  all: ["purchase-orders"] as const,
  list: (filter: PurchaseOrderFilter, cursor: string | null) => ["purchase-orders", "list", filter, cursor] as const,
  detail: (id: number) => ["purchase-orders", "detail", id] as const,
};

export function usePurchaseOrderPage(filter: PurchaseOrderFilter, cursor: string | null) {
  return useQuery({
    queryKey: purchaseOrderKeys.list(filter, cursor),
    queryFn: () => listPurchaseOrders(filter, cursor),
    placeholderData: keepPreviousData,
    refetchInterval: filter === "open" ? POLL_INTERVAL_MS : false,
  });
}

export function usePurchaseOrder(id: number) {
  return useQuery({
    queryKey: purchaseOrderKeys.detail(id),
    queryFn: () => getPurchaseOrder(id),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useCreatePurchaseOrder() {
  return useInvalidatingMutation(createPurchaseOrder, [purchaseOrderKeys.all]);
}

export function usePurchaseOrderAction(id: number) {
  const run = (action: PurchaseOrderAction) => runPurchaseOrderAction(id, action);
  return useInvalidatingMutation(run, [purchaseOrderKeys.all]);
}

export function useReceiveDelivery(id: number) {
  const receive = (input: DeliveryInput) => receiveDelivery(id, input);
  return useInvalidatingMutation(receive, [purchaseOrderKeys.all, ...stockKeys]);
}
