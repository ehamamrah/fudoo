import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bodiesSentTo, mockApi, requestedUrls } from "../../test/mockApi";
import { firstPage, nthPage, page, searchPage } from "../../test/pages";
import { renderPage } from "../../test/render";
import { MenuItemsPage } from "./MenuItemsPage";

const LIST = "/api/menu-items/";
const options = [
  { id: 1, name: "Beef", unit: "g" },
  { id: 2, name: "Bun", unit: "pcs" },
];
const burger = {
  id: 1,
  name: "Classic Burger",
  recipe: [
    { ingredient: 1, ingredient_name: "Beef", unit: "g", quantity: "150.000" },
    { ingredient: 2, ingredient_name: "Bun", unit: "pcs", quantity: "1.000" },
  ],
};
const veggie = { id: 2, name: "Veggie Burger", recipe: [] };
const base = { "GET /api/ingredients/options/": options, [`GET ${firstPage(LIST)}`]: page([burger], { count: 26, next: nthPage(LIST, 2) }) };

describe("MenuItemsPage", () => {
  it("lists menu items with their recipes", async () => {
    mockApi(base);
    renderPage(<MenuItemsPage />);
    expect(await screen.findByText("Classic Burger")).toBeInTheDocument();
    expect(screen.getByText("Beef: 150 g")).toBeInTheDocument();
    expect(screen.getByText("Bun: 1 pcs")).toBeInTheDocument();
  });

  it("follows to page 2", async () => {
    mockApi({ ...base, [`GET ${nthPage(LIST, 2)}`]: page([veggie], { count: 26 }) });
    renderPage(<MenuItemsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("Veggie Burger")).toBeInTheDocument();
  });

  it("searches by name", async () => {
    const fetchMock = mockApi({ ...base, [`GET ${searchPage(LIST, "veg")}`]: page([veggie]) });
    renderPage(<MenuItemsPage />);
    await userEvent.type(await screen.findByLabelText("Search menu items"), "veg");
    expect(await screen.findByText("Veggie Burger")).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain(searchPage(LIST, "veg"));
  });

  it("creates a menu item with recipe lines picked from the ingredient options", async () => {
    const fetchMock = mockApi({ ...base, "POST /api/menu-items/": { status: 201, body: burger } });
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
    mockApi(base);
    renderPage(<MenuItemsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Add line" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove line 1" }));
    expect(screen.queryByLabelText("Ingredient 2")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove line 1" })).toBeDisabled();
  });
});
