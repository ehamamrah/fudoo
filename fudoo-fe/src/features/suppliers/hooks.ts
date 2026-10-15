import { useQuery } from "@tanstack/react-query";
import { createSupplier, listSuppliers, updateSupplierIngredients } from "../../api/suppliers";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";

export const supplierKeys = { all: ["suppliers"] as const };

export function useSuppliers() {
  return useQuery({ queryKey: supplierKeys.all, queryFn: listSuppliers });
}

export function useCreateSupplier() {
  return useInvalidatingMutation(createSupplier, [supplierKeys.all]);
}

export function useUpdateSupplierIngredients(id: number) {
  const update = (ingredients: number[]) => updateSupplierIngredients(id, ingredients);
  return useInvalidatingMutation(update, [supplierKeys.all]);
}
