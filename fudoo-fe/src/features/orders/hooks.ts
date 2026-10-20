import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createOrder, listOrders } from "../../api/orders";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";
import { stockKeys } from "../ingredients/hooks";

const orderKeys = {
  all: ["orders"] as const,
  list: (cursor: string | null) => ["orders", "list", cursor] as const,
};

export function useOrderPage(cursor: string | null) {
  return useQuery({ queryKey: orderKeys.list(cursor), queryFn: () => listOrders(cursor), placeholderData: keepPreviousData });
}

export function useCreateOrder() {
  return useInvalidatingMutation(createOrder, [orderKeys.all, ...stockKeys]);
}
