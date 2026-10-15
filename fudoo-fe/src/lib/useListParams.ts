import { useSearchParams } from "react-router";

type Changes = Record<string, string | null>;

function applied(current: URLSearchParams, changes: Changes): URLSearchParams {
  const next = new URLSearchParams(current);
  Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
  return next;
}

function useListParams(position: string) {
  const [params, setParams] = useSearchParams();
  const setPosition = (value: string | null, replace = false) =>
    setParams((current) => applied(current, { [position]: value }), { replace });
  const setFilter = (name: string, value: string | null, replace = false) =>
    setParams((current) => applied(current, { [name]: value, [position]: null }), { replace });
  const setSearch = (search: string) => setFilter("search", search, true);
  return { params, setPosition, setFilter, setSearch, search: params.get("search") ?? "" };
}

function toPage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

export function usePageNumberParams() {
  const list = useListParams("page");
  const setPage = (page: number) => list.setPosition(page > 1 ? String(page) : null);
  const resetPage = () => list.setPosition(null, true);
  return { ...list, page: toPage(list.params.get("page")), setPage, resetPage };
}

export function useCursorParams() {
  const list = useListParams("cursor");
  return { ...list, cursor: list.params.get("cursor"), setCursor: (cursor: string | null) => list.setPosition(cursor) };
}

export type PageNumberParams = ReturnType<typeof usePageNumberParams>;
export type CursorParams = ReturnType<typeof useCursorParams>;
