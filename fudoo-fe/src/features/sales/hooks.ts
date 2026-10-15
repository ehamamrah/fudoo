import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createSale, listSales } from "../../api/sales";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";
import { stockKeys } from "../ingredients/hooks";

const saleKeys = {
  all: ["sales"] as const,
  list: (cursor: string | null) => ["sales", "list", cursor] as const,
};

export function useSalePage(cursor: string | null) {
  return useQuery({ queryKey: saleKeys.list(cursor), queryFn: () => listSales(cursor), placeholderData: keepPreviousData });
}

export function useCreateSale() {
  return useInvalidatingMutation(createSale, [saleKeys.all, ...stockKeys]);
}
