import { get, post, withQuery } from "./client";
import { catalogPath } from "./pagination";
import type { Ingredient, IngredientInput, IngredientOption, IngredientParams, IngredientSummary, Page } from "./types";

export const listIngredients = ({ outOfStock, ...params }: IngredientParams) =>
  get<Page<Ingredient>>(catalogPath("/ingredients/", params, outOfStock ? { stock: "out" } : {}));

export const getIngredientSummary = () => get<IngredientSummary>("/ingredients/summary/");

export const listIngredientOptions = (supplier?: number) =>
  get<IngredientOption[]>(withQuery("/ingredients/options/", { supplier }));

export const createIngredient = (input: IngredientInput) => post<Ingredient>("/ingredients/", input);
