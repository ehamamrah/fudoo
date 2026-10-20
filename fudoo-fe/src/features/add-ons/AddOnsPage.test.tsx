import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bodiesSentTo, mockApi, requestedUrls } from "../../test/mockApi";
import { firstPage, nthPage, page, searchPage } from "../../test/pages";
import { renderPage } from "../../test/render";
import { AddOnsPage } from "./AddOnsPage";

const LIST = "/api/add-ons/";
const options = [
  { id: 3, name: "Cheddar", unit: "pcs" },
  { id: 4, name: "Bacon", unit: "g" },
];
const cheese = { id: 1, name: "Extra cheese", recipe: [{ ingredient: 3, ingredient_name: "Cheddar", unit: "pcs", quantity: "1.000" }] };
const bacon = { id: 2, name: "Bacon strips", recipe: [{ ingredient: 4, ingredient_name: "Bacon", unit: "g", quantity: "30.500" }] };
const base = { "GET /api/ingredients/options/": options, [`GET ${firstPage(LIST)}`]: page([cheese], { count: 26, next: nthPage(LIST, 2) }) };

describe("AddOnsPage", () => {
  it("lists add-ons with their recipes", async () => {
    mockApi(base);
    renderPage(<AddOnsPage />);
    expect(await screen.findByText("Extra cheese")).toBeInTheDocument();
    expect(screen.getByText("Cheddar: 1 pcs")).toBeInTheDocument();
  });

  it("follows to page 2", async () => {
    mockApi({ ...base, [`GET ${nthPage(LIST, 2)}`]: page([bacon], { count: 26 }) });
    renderPage(<AddOnsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("Bacon: 30.5 g")).toBeInTheDocument();
  });

  it("searches by name", async () => {
    const fetchMock = mockApi({ ...base, [`GET ${searchPage(LIST, "bac")}`]: page([bacon]) });
    renderPage(<AddOnsPage />);
    await userEvent.type(await screen.findByLabelText("Search add-ons"), "bac");
    expect(await screen.findByText("Bacon strips")).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain(searchPage(LIST, "bac"));
  });

  it("creates an add-on with the recipe as typed", async () => {
    const fetchMock = mockApi({ ...base, "POST /api/add-ons/": { status: 201, body: bacon } });
    renderPage(<AddOnsPage />);
    await userEvent.type(await screen.findByLabelText("Name"), "Bacon strips");
    await userEvent.selectOptions(screen.getByLabelText("Ingredient 1"), "4");
    await userEvent.type(screen.getByLabelText("Quantity 1"), "30.5");
    await userEvent.click(screen.getByRole("button", { name: "Add add-on" }));
    const expected = { name: "Bacon strips", recipe: [{ ingredient: 4, quantity: "30.5" }] };
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", "/api/add-ons/")).toEqual([expected]));
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
  });

  it("shows a validation error verbatim", async () => {
    mockApi({ ...base, "POST /api/add-ons/": { status: 400, body: { name: ["add on with this name already exists."] } } });
    renderPage(<AddOnsPage />);
    await userEvent.type(await screen.findByLabelText("Name"), "Extra cheese");
    await userEvent.selectOptions(screen.getByLabelText("Ingredient 1"), "3");
    await userEvent.type(screen.getByLabelText("Quantity 1"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Add add-on" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("name: add on with this name already exists.");
  });
});
