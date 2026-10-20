import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { CatalogParams, Option, Page, RecipeItem, RecipeItemInput } from "../../api/types";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";

export interface RecipeCatalog {
  key: string;
  list: (params: CatalogParams) => Promise<Page<RecipeItem>>;
  options: () => Promise<Option[]>;
  create: (input: RecipeItemInput) => Promise<RecipeItem>;
}

export function useRecipePage(catalog: RecipeCatalog, params: CatalogParams) {
  return useQuery({
    queryKey: [catalog.key, "list", params],
    queryFn: () => catalog.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useRecipeOptions(catalog: RecipeCatalog) {
  return useQuery({ queryKey: [catalog.key, "options"], queryFn: catalog.options });
}

export function useCreateRecipe(catalog: RecipeCatalog) {
  return useInvalidatingMutation(catalog.create, [[catalog.key]]);
}
