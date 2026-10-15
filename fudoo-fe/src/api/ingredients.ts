import { get, post } from "./client";
import type { Ingredient, IngredientInput } from "./types";

export const listIngredients = () => get<Ingredient[]>("/ingredients/");
export const createIngredient = (input: IngredientInput) => post<Ingredient>("/ingredients/", input);
