import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockApi, requestedUrls, requestsTo } from "../../test/mockApi";
import { firstPage, page } from "../../test/pages";
import { renderPage } from "../../test/render";
import { StockPage } from "./StockPage";

const LIST = "/api/ingredients/";
const SUMMARY = "/api/ingredients/summary/";
const OUT_ONLY = `${firstPage(LIST)}&stock=out`;
const ingredients = [
  { id: 1, name: "Beef", unit: "g", on_hand: "120.000", out_of_stock: false },
  { id: 2, name: "Bun", unit: "pcs", on_hand: "0.000", out_of_stock: true },
  { id: 3, name: "Cheese", unit: "g", on_hand: "2500.500", out_of_stock: false },
];
const routes = {
  [`GET ${firstPage(LIST)}`]: page(ingredients, { count: 40 }),
  [`GET ${OUT_ONLY}`]: page([ingredients[1]]),
  [`GET ${SUMMARY}`]: { total: 40, in_stock: 33, out_of_stock: 7 },
};

describe("StockPage", () => {
  afterEach(() => vi.useRealTimers());

  it("shows on-hand quantities and flags ingredients the API marks out of stock", async () => {
    mockApi(routes);
    renderPage(<StockPage />);
    expect(await screen.findByText("2500.5 g")).toBeInTheDocument();
    expect(screen.getByTestId("stock-1")).toHaveTextContent("In stock");
    expect(screen.getByTestId("stock-2")).toHaveTextContent("Out of stock");
    expect(screen.getByText(/Updated \d+s ago/)).toBeInTheDocument();
  });

  it("takes the stat cards from the summary endpoint", async () => {
    mockApi(routes);
    renderPage(<StockPage />);
    const card = async (label: string) => (await screen.findByText(label, { selector: "p" })).parentElement;
    expect(await card("Ingredients tracked")).toHaveTextContent("40");
    expect(await card("In stock")).toHaveTextContent("33");
    expect(await card("Out of stock")).toHaveTextContent("7");
  });

  it("asks the API for out-of-stock ingredients only", async () => {
    const fetchMock = mockApi(routes);
    renderPage(<StockPage />, { route: "/?page=2" });
    await userEvent.click(await screen.findByLabelText("Out of stock only"));
    await screen.findByText("1–1 of 1");
    expect(screen.queryByText("Beef")).not.toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain(OUT_ONLY);
  });

  it("polls the current page and the summary every 5 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = mockApi(routes);
    renderPage(<StockPage />);
    await screen.findByText("Beef");
    const calls = () => [requestsTo(fetchMock, "GET", firstPage(LIST)).length, requestsTo(fetchMock, "GET", SUMMARY).length];
    const [pageBefore, summaryBefore] = calls();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    const [pageAfter, summaryAfter] = calls();
    expect(pageAfter).toBeGreaterThan(pageBefore);
    expect(summaryAfter).toBeGreaterThan(summaryBefore);
  });
});
