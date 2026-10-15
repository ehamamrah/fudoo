import type { ReactNode } from "react";
import { ErrorBanner } from "./ErrorBanner";

interface QueryStateProps<T> {
  query: { data: T | undefined; error: unknown; isPending: boolean };
  children: (data: T) => ReactNode;
}

function Loading() {
  return (
    <p className="flex items-center gap-2 text-sm text-slate-500">
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      Loading…
    </p>
  );
}

export function QueryState<T>({ query, children }: QueryStateProps<T>) {
  if (query.error) return <ErrorBanner error={query.error} />;
  if (query.isPending || query.data === undefined) return <Loading />;
  return <>{children(query.data)}</>;
}
