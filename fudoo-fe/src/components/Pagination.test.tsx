import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cursorPage, page } from "../test/pages";
import { CursorPagination, PageNumberPagination } from "./Pagination";
import { SEARCH_DEBOUNCE_MS, SearchInput } from "./SearchInput";

const rows = (n: number) => Array.from({ length: n }, (_, id) => ({ id }));
const links = { next: "/api/ingredients/?page=3&page_size=25", previous: "/api/ingredients/?page=1&page_size=25" };

describe("PageNumberPagination", () => {
  it("shows the range and moves to the next and previous page", async () => {
    const onPage = vi.fn();
    render(<PageNumberPagination page={2} data={page(rows(25), { count: 132, ...links })} busy={false} onPage={onPage} />);
    expect(screen.getByText("26–50 of 132")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPage.mock.calls).toEqual([[3], [1]]);
  });

  it("disables the ends and every button while a page is loading", () => {
    const { rerender } = render(<PageNumberPagination page={6} data={page(rows(7), { count: 132, previous: links.previous })} busy={false} onPage={vi.fn()} />);
    expect(screen.getByText("126–132 of 132")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    rerender(<PageNumberPagination page={2} data={page(rows(25), { count: 132, ...links })} busy onPage={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});

describe("CursorPagination", () => {
  it("follows the next and previous links as given", async () => {
    const onCursor = vi.fn();
    const data = cursorPage([], { next: "/api/sales/?cursor=n&page_size=25", previous: "/api/sales/?cursor=p" });
    render(<CursorPagination data={data} busy={false} onCursor={onCursor} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onCursor.mock.calls).toEqual([["n"], ["p"]]);
  });

  it("goes back to the first page when the previous link has no cursor", async () => {
    const onCursor = vi.fn();
    render(<CursorPagination data={cursorPage([], { previous: "/api/sales/" })} busy={false} onCursor={onCursor} />);
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onCursor).toHaveBeenCalledWith(null);
  });

  it("renders nothing when there is a single page", () => {
    render(<CursorPagination data={cursorPage([])} busy={false} onCursor={vi.fn()} />);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
  });
});

describe("SearchInput", () => {
  afterEach(() => vi.useRealTimers());

  it("reports the trimmed search once typing pauses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSearch = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<SearchInput label="Search" value="" onSearch={onSearch} />);
    await user.type(screen.getByLabelText("Search"), " beef ");
    expect(onSearch).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));
    expect(onSearch.mock.calls).toEqual([["beef"]]);
  });
});
