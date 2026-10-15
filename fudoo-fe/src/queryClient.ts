import { QueryClient } from "@tanstack/react-query";

export const POLL_INTERVAL_MS = 5000;
const STALE_TIME_MS = 30_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: STALE_TIME_MS, refetchOnWindowFocus: true, refetchIntervalInBackground: false },
    },
  });
}
