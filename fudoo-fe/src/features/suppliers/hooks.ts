import { useQuery } from "@tanstack/react-query";
import { createSupplier, listSuppliers } from "../../api/suppliers";
import { useInvalidatingMutation } from "../../lib/useInvalidatingMutation";

export const supplierKeys = { all: ["suppliers"] as const };

export function useSuppliers() {
  return useQuery({ queryKey: supplierKeys.all, queryFn: listSuppliers });
}

export function useCreateSupplier() {
  return useInvalidatingMutation(createSupplier, [supplierKeys.all]);
}
