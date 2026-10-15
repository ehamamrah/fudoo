import { useEffect, useEffectEvent, type ReactNode } from "react";
import { ApiError } from "../api/client";
import type { CursorPage, Page } from "../api/types";
import type { CursorParams, PageNumberParams } from "../lib/useListParams";
import { CursorPagination, PageNumberPagination } from "./Pagination";
import { Loading, QueryState } from "./QueryState";

interface PagedQuery<P> {
  data: P | undefined;
  error: unknown;
  isPending: boolean;
  isPlaceholderData: boolean;
}

function Results({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <div aria-busy={busy} className={`flex flex-col gap-3 transition-opacity ${busy ? "opacity-60" : ""}`}>
      {children}
    </div>
  );
}

const isPageGone = (error: unknown, page: number) => page > 1 && error instanceof ApiError && error.status === 404;

function useResetGonePage(error: unknown, list: PageNumberParams): boolean {
  const gone = isPageGone(error, list.page);
  const reset = useEffectEvent(() => list.resetPage());
  useEffect(() => {
    if (gone) reset();
  }, [gone]);
  return gone;
}

interface PageNumberResultsProps<T> {
  query: PagedQuery<Page<T>>;
  list: PageNumberParams;
  children: (rows: T[]) => ReactNode;
}

export function PageNumberResults<T>({ query, list, children }: PageNumberResultsProps<T>) {
  const busy = query.isPlaceholderData;
  const gone = useResetGonePage(query.error, list);
  if (gone) return <Loading />;
  return (
    <QueryState query={query}>
      {(data) => (
        <Results busy={busy}>
          {children(data.results)}
          <PageNumberPagination page={list.page} data={data} busy={busy} onPage={list.setPage} />
        </Results>
      )}
    </QueryState>
  );
}

interface CursorResultsProps<T> {
  query: PagedQuery<CursorPage<T>>;
  list: CursorParams;
  children: (rows: T[]) => ReactNode;
}

export function CursorResults<T>({ query, list, children }: CursorResultsProps<T>) {
  const busy = query.isPlaceholderData;
  return (
    <QueryState query={query}>
      {(data) => (
        <Results busy={busy}>
          {children(data.results)}
          <CursorPagination data={data} busy={busy} onCursor={list.setCursor} />
        </Results>
      )}
    </QueryState>
  );
}
