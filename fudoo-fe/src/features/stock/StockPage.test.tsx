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
const burger = {
  id: 1,
  name: "Classic Burger",
  recipe: [
    { ingredient: 1, ingredient_name: "Beef", unit: "g", quantity: "150.000" },
    { ingredient: 3, ingredient_name: "Cheese", unit: "g", quantity: "20.000" },
  ],
};

describe("StockPage", () => {
  afterEach(() => vi.useRealTimers());

  it("shows on-hand quantities and flags out-of-stock and low ingredients", async () => {
    mockApi({ "GET /api/ingredients/": ingredients, "GET /api/menu-items/": [burger] });
    renderPage(<StockPage />);
    expect(await screen.findByText("2500.5 g")).toBeInTheDocument();
    expect(screen.getByTestId("stock-1")).toHaveTextContent("Low");
    expect(screen.getByTestId("stock-1")).toHaveTextContent("Classic Burger");
    expect(screen.getByTestId("stock-2")).toHaveTextContent("Out of stock");
    expect(screen.getByTestId("stock-3")).toHaveTextContent("OK");
    expect(screen.getByText(/Updated \d+s ago/)).toBeInTheDocument();
  });

  it("polls ingredients every 5 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = mockApi({ "GET /api/ingredients/": ingredients, "GET /api/menu-items/": [] });
    renderPage(<StockPage />);
    await screen.findByText("Beef");
    const ingredientCalls = () => fetchMock.mock.calls.filter(([url]) => String(url) === "/api/ingredients/").length;
    const before = ingredientCalls();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(ingredientCalls()).toBeGreaterThan(before);
  });
});
