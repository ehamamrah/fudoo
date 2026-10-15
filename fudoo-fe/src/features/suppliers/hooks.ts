import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createSupplier, listSupplierOptions, listSuppliers, updateSupplierIngredients } from "../../api/suppliers";
import type { CatalogParams } from "../../api/types";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";
import { ingredientKeys } from "../ingredients/hooks";

const supplierKeys = {
  all: ["suppliers"] as const,
  list: (params: CatalogParams) => ["suppliers", "list", params] as const,
  options: ["suppliers", "options"] as const,
};

export function useSupplierPage(params: CatalogParams) {
  return useQuery({ queryKey: supplierKeys.list(params), queryFn: () => listSuppliers(params), placeholderData: keepPreviousData });
}

export function useSupplierOptions() {
  return useQuery({ queryKey: supplierKeys.options, queryFn: listSupplierOptions });
}

export function useCreateSupplier() {
  return useInvalidatingMutation(createSupplier, [supplierKeys.all]);
}

export function useUpdateSupplierIngredients(id: number) {
  const update = (ingredients: number[]) => updateSupplierIngredients(id, ingredients);
  return useInvalidatingMutation(update, [supplierKeys.all, ingredientKeys.supplierOptions(id)]);
}
