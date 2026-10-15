import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { describe, expect, it } from "vitest";
import { useCursorParams, usePageNumberParams } from "./useListParams";

function routerAt(route: string) {
  return ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
}

function renderPageNumber(route = "/") {
  return renderHook(() => ({ list: usePageNumberParams(), location: useLocation(), navigate: useNavigate() }), { wrapper: routerAt(route) });
}

describe("usePageNumberParams", () => {
  it("reads page and search from the URL, defaulting to page 1", () => {
    expect(renderPageNumber("/?page=3&search=beef").result.current.list).toMatchObject({ page: 3, search: "beef" });
    expect(renderPageNumber("/?page=abc").result.current.list.page).toBe(1);
  });

  it("writes the page to the URL and drops it for page 1", () => {
    const { result } = renderPageNumber("/?search=beef");
    act(() => result.current.list.setPage(2));
    expect(result.current.location.search).toBe("?search=beef&page=2");
    act(() => result.current.list.setPage(1));
    expect(result.current.location.search).toBe("?search=beef");
  });

  it("goes back to the previous page with the browser history", () => {
    const { result } = renderPageNumber("/");
    act(() => result.current.list.setPage(2));
    act(() => void result.current.navigate(-1));
    expect(result.current.list.page).toBe(1);
  });

  it("resets to page 1 when the search or a filter changes", () => {
    const { result } = renderPageNumber("/?page=4");
    act(() => result.current.list.setSearch("bun"));
    expect(result.current.location.search).toBe("?search=bun");
    act(() => result.current.list.setPage(2));
    act(() => result.current.list.setFilter("stock", "out"));
    expect(result.current.location.search).toBe("?search=bun&stock=out");
  });
});

describe("useCursorParams", () => {
  it("keeps the cursor token in the URL and drops it when a filter changes", () => {
    const { result } = renderHook(() => ({ list: useCursorParams(), location: useLocation() }), { wrapper: routerAt("/") });
    act(() => result.current.list.setCursor("abc"));
    expect(result.current.location.search).toBe("?cursor=abc");
    act(() => result.current.list.setFilter("status", "open"));
    expect(result.current.list.cursor).toBeNull();
    expect(result.current.location.search).toBe("?status=open");
  });
});
