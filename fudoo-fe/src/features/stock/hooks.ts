import type { IngredientParams } from "../../api/types";
import { POLL_INTERVAL_MS } from "../../queryClient";
import { useIngredientPage, useIngredientSummary } from "../ingredients/hooks";

export const useStockPage = (params: IngredientParams) => useIngredientPage(params, POLL_INTERVAL_MS);
export const useStockSummary = () => useIngredientSummary(POLL_INTERVAL_MS);
