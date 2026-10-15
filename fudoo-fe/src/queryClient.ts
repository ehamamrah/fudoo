import { QueryClient } from "@tanstack/react-query";

export const POLL_INTERVAL_MS = 5000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
  });
}
