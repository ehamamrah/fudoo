import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createIngredient, getIngredientSummary, listIngredientOptions, listIngredients } from "../../api/ingredients";
import type { IngredientParams } from "../../api/types";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";

export const ingredientKeys = {
  all: ["ingredients"] as const,
  lists: ["ingredients", "list"] as const,
  list: (params: IngredientParams) => ["ingredients", "list", params] as const,
  summary: ["ingredients", "summary"] as const,
  supplierOptions: (supplier: number | null) => ["ingredients", "options", supplier] as const,
};

export const stockKeys = [ingredientKeys.lists, ingredientKeys.summary];

export function useIngredientPage(params: IngredientParams, refetchInterval: number | false = false) {
  return useQuery({
    queryKey: ingredientKeys.list(params),
    queryFn: () => listIngredients(params),
    placeholderData: keepPreviousData,
    refetchInterval,
  });
}

export function useIngredientSummary(refetchInterval: number) {
  return useQuery({ queryKey: ingredientKeys.summary, queryFn: getIngredientSummary, refetchInterval });
}

export function useIngredientOptions(supplier: number | null = null, enabled = true) {
  return useQuery({
    queryKey: ingredientKeys.supplierOptions(supplier),
    queryFn: () => listIngredientOptions(supplier ?? undefined),
    enabled,
  });
}

export function useCreateIngredient() {
  return useInvalidatingMutation(createIngredient, [ingredientKeys.all]);
}
