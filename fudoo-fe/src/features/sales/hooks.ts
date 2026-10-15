import { useQuery } from "@tanstack/react-query";
import { createSale, listSales } from "../../api/sales";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";
import { ingredientKeys } from "../ingredients/hooks";

const saleKeys = { all: ["sales"] as const };

export function useSales() {
  return useQuery({ queryKey: saleKeys.all, queryFn: listSales });
}

export function useCreateSale() {
  return useInvalidatingMutation(createSale, [saleKeys.all, ingredientKeys.all]);
}
