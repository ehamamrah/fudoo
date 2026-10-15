import { useQuery } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "../../queryClient";
import { ingredientsQuery } from "../ingredients/hooks";

export function useStock() {
  return useQuery({ ...ingredientsQuery, refetchInterval: POLL_INTERVAL_MS });
}
