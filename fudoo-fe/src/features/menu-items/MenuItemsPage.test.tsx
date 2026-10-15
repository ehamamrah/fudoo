import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bodiesSentTo, mockApi } from "../../test/mockApi";
import { renderPage } from "../../test/render";
import { MenuItemsPage } from "./MenuItemsPage";

const ingredients = [
  { id: 1, name: "Beef", unit: "g", on_hand: "0.000" },
  { id: 2, name: "Bun", unit: "pcs", on_hand: "0.000" },
];
const burger = {
  id: 1,
  name: "Classic Burger",
  recipe: [
    { ingredient: 1, ingredient_name: "Beef", unit: "g", quantity: "150.000" },
    { ingredient: 2, ingredient_name: "Bun", unit: "pcs", quantity: "1.000" },
  ],
};

describe("MenuItemsPage", () => {
  it("lists menu items with their recipes", async () => {
    mockApi({ "GET /api/ingredients/": ingredients, "GET /api/menu-items/": [burger] });
    renderPage(<MenuItemsPage />);
    expect(await screen.findByText("Classic Burger")).toBeInTheDocument();
    expect(screen.getByText("Beef: 150 g")).toBeInTheDocument();
    expect(screen.getByText("Bun: 1 pcs")).toBeInTheDocument();
  });

  it("creates a menu item with dynamic recipe lines", async () => {
    const fetchMock = mockApi({
      "GET /api/ingredients/": ingredients,
      "GET /api/menu-items/": [],
      "POST /api/menu-items/": { status: 201, body: burger },
    });
    renderPage(<MenuItemsPage />);
    await userEvent.type(await screen.findByLabelText("Name"), "Classic Burger");
    await userEvent.selectOptions(screen.getByLabelText("Ingredient 1"), "1");
    await userEvent.type(screen.getByLabelText("Quantity 1"), "150");
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    await userEvent.selectOptions(screen.getByLabelText("Ingredient 2"), "2");
    await userEvent.type(screen.getByLabelText("Quantity 2"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Add menu item" }));
    const expected = { name: "Classic Burger", recipe: [{ ingredient: 1, quantity: "150" }, { ingredient: 2, quantity: "1" }] };
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", "/api/menu-items/")).toEqual([expected]));
  });

  it("removes a recipe line", async () => {
    mockApi({ "GET /api/ingredients/": ingredients, "GET /api/menu-items/": [] });
    renderPage(<MenuItemsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Add line" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove line 1" }));
    expect(screen.queryByLabelText("Ingredient 2")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove line 1" })).toBeDisabled();
  });
});
