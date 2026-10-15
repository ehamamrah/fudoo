import { queryOptions, useQuery } from "@tanstack/react-query";
import { createIngredient, listIngredients } from "../../api/ingredients";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";

export const ingredientKeys = { all: ["ingredients"] as const };

export const ingredientsQuery = queryOptions({ queryKey: ingredientKeys.all, queryFn: listIngredients });

export function useIngredients() {
  return useQuery(ingredientsQuery);
}

export function useCreateIngredient() {
  return useInvalidatingMutation(createIngredient, [ingredientKeys.all]);
}
