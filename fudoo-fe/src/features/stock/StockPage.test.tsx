import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockApi } from "../../test/mockApi";
import { renderPage } from "../../test/render";
import { StockPage } from "./StockPage";

const ingredients = [
  { id: 1, name: "Beef", unit: "g", on_hand: "120.000" },
  { id: 2, name: "Bun", unit: "pcs", on_hand: "0.000" },
  { id: 3, name: "Cheese", unit: "g", on_hand: "2500.500" },
];
describe("StockPage", () => {
  afterEach(() => vi.useRealTimers());

  it("shows on-hand quantities and flags out-of-stock ingredients", async () => {
    mockApi({ "GET /api/ingredients/": ingredients });
    renderPage(<StockPage />);
    expect(await screen.findByText("2500.5 g")).toBeInTheDocument();
    expect(screen.getByTestId("stock-1")).toHaveTextContent("In stock");
    expect(screen.getByTestId("stock-2")).toHaveTextContent("Out of stock");
    expect(screen.getByTestId("stock-3")).toHaveTextContent("In stock");
    expect(screen.getByText(/Updated \d+s ago/)).toBeInTheDocument();
  });

  it("polls ingredients every 5 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = mockApi({ "GET /api/ingredients/": ingredients });
    renderPage(<StockPage />);
    await screen.findByText("Beef");
    const ingredientCalls = () => fetchMock.mock.calls.filter(([url]) => String(url) === "/api/ingredients/").length;
    const before = ingredientCalls();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(ingredientCalls()).toBeGreaterThan(before);
  });
});
