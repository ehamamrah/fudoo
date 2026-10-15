import { screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bodiesSentTo, deferred, mockApi, requestedUrls } from "../../test/mockApi";
import { firstPage, nthPage, page, searchPage } from "../../test/pages";
import { renderPage } from "../../test/render";
import { IngredientsPage } from "./IngredientsPage";

const LIST = "/api/ingredients/";
const beef = { id: 1, name: "Beef", unit: "g", on_hand: "1500.000", out_of_stock: false };
const bun = { id: 2, name: "Bun", unit: "pcs", on_hand: "0.000", out_of_stock: true };

function SearchProbe() {
  return <output data-testid="location">{useLocation().search}</output>;
}
const PAGE_2_LINK = "/api/ingredients/?page=2&page_size=25";

describe("IngredientsPage", () => {
  it("lists the page results with trimmed on-hand quantities and the range", async () => {
    mockApi({ [`GET ${firstPage(LIST)}`]: page([beef], { count: 26, next: PAGE_2_LINK }) });
    renderPage(<IngredientsPage />);
    expect(await screen.findByText("Beef")).toBeInTheDocument();
    expect(screen.getByText("1500 g")).toBeInTheDocument();
    expect(screen.getByText("1–1 of 26")).toBeInTheDocument();
  });

  it("moves to page 2 and keeps page 1 on screen until it arrives", async () => {
    const second = deferred();
    mockApi({ [`GET ${firstPage(LIST)}`]: page([beef], { count: 26, next: PAGE_2_LINK }), [`GET ${nthPage(LIST, 2)}`]: second.promise });
    renderPage(<IngredientsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(screen.getByText("Beef").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
    second.resolve(page([bun], { count: 26, previous: firstPage(LIST) }));
    expect(await screen.findByText("Bun")).toBeInTheDocument();
    expect(screen.queryByText("Beef")).not.toBeInTheDocument();
    expect(screen.getByText("26–26 of 26")).toBeInTheDocument();
  });

  it("searches by name and goes back to page 1", async () => {
    const fetchMock = mockApi({ [`GET ${nthPage(LIST, 2)}`]: page([bun], { count: 26 }), [`GET ${searchPage(LIST, "be")}`]: page([beef]) });
    renderPage(<IngredientsPage />, { route: "/?page=2" });
    await screen.findByText("Bun");
    await userEvent.type(screen.getByLabelText("Search ingredients"), "be");
    expect(await screen.findByText("Beef")).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toEqual([nthPage(LIST, 2), searchPage(LIST, "be")]);
  });

  it("resets to page 1 when the page no longer exists", async () => {
    const gone = { status: 404, body: { detail: "Invalid page." } };
    mockApi({ [`GET ${nthPage(LIST, 9)}`]: gone, [`GET ${firstPage(LIST)}`]: page([beef]) });
    renderPage(<><IngredientsPage /><SearchProbe /></>, { route: "/?page=9" });
    expect(await screen.findByText("Beef")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(/^$/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says when a search matches nothing", async () => {
    mockApi({ [`GET ${searchPage(LIST, "zz")}`]: page([]) });
    renderPage(<IngredientsPage />, { route: "/?search=zz" });
    expect(await screen.findByText("No matches for “zz”.")).toBeInTheDocument();
  });

  it("creates an ingredient with the chosen unit", async () => {
    const fetchMock = mockApi({ [`GET ${firstPage(LIST)}`]: page([]), "POST /api/ingredients/": { status: 201, body: beef } });
    renderPage(<IngredientsPage />);
    await userEvent.type(screen.getByLabelText("Name"), "Milk");
    await userEvent.selectOptions(screen.getByLabelText("Unit"), "ml");
    await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", "/api/ingredients/")).toEqual([{ name: "Milk", unit: "ml" }]));
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
  });

  it("shows validation errors from the API", async () => {
    const body = { name: ["ingredient with this name already exists."] };
    mockApi({ [`GET ${firstPage(LIST)}`]: page([]), "POST /api/ingredients/": { status: 400, body } });
    renderPage(<IngredientsPage />);
    await userEvent.type(screen.getByLabelText("Name"), "Beef");
    await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("name: ingredient with this name already exists.");
  });
});
