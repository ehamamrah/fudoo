import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import App from "./App";
import { mockApi } from "./test/mockApi";

describe("App", () => {
  it("renders the nav and the stock page at home", async () => {
    mockApi({
      "GET /api/ingredients/?page=1&page_size=25": { count: 0, next: null, previous: null, results: [] },
      "GET /api/ingredients/summary/": { total: 0, in_stock: 0, out_of_stock: 0 },
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><App /></MemoryRouter>
      </QueryClientProvider>,
    );
    const labels = ["Stock", "Ingredients", "Suppliers", "Menu items", "Add-ons", "Purchase orders", "POS Simulator"];
    labels.forEach((label) => expect(screen.getByRole("link", { name: label })).toBeInTheDocument());
    expect(await screen.findByRole("heading", { name: "Stock" })).toBeInTheDocument();
  });
});
