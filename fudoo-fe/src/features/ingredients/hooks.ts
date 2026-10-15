import { useQuery } from "@tanstack/react-query";
import { createIngredient, listIngredients } from "../../api/ingredients";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";
import { POLL_INTERVAL_MS } from "../../queryClient";

export const ingredientKeys = { all: ["ingredients"] as const };

export function useIngredients() {
  return useQuery({ queryKey: ingredientKeys.all, queryFn: listIngredients, refetchInterval: POLL_INTERVAL_MS });
}

export function useCreateIngredient() {
  return useInvalidatingMutation(createIngredient, [ingredientKeys.all]);
}
