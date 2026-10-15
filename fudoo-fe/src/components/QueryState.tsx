import type { ReactNode } from "react";
import { ErrorBanner } from "./ErrorBanner";

interface QueryStateProps<T> {
  query: { data: T | undefined; error: unknown; isPending: boolean };
  children: (data: T) => ReactNode;
}

export function QueryState<T>({ query, children }: QueryStateProps<T>) {
  if (query.error) return <ErrorBanner error={query.error} />;
  if (query.isPending || query.data === undefined) return <p className="text-sm text-gray-500">Loading…</p>;
  return <>{children(query.data)}</>;
}
