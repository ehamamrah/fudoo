import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bodiesSentTo, mockApi, requestedUrls } from "../../test/mockApi";
import { firstPage, nthPage, page, searchPage } from "../../test/pages";
import { renderPage } from "../../test/render";
import { SuppliersPage } from "./SuppliersPage";

const LIST = "/api/suppliers/";
const OPTIONS = "/api/ingredients/options/";
const options = [
  { id: 1, name: "Beef", unit: "g" },
  { id: 2, name: "Bun", unit: "pcs" },
  { id: 3, name: "Cheese", unit: "g" },
];
const meatCo = { id: 1, name: "Meat Co", contact: "orders@meatco.test", ingredients: [1, 3], supplies: [{ id: 1, name: "Beef" }, { id: 3, name: "Cheese" }] };
const bakery = { id: 2, name: "Bakery", contact: "", ingredients: [], supplies: [] };
const base = { [`GET ${OPTIONS}`]: options, [`GET ${firstPage(LIST)}`]: page([meatCo, bakery], { count: 30, next: nthPage(LIST, 2) }) };

describe("SuppliersPage", () => {
  it("lists suppliers with the names from supplies, without loading ingredient lists", async () => {
    const fetchMock = mockApi(base);
    renderPage(<SuppliersPage />);
    const meatRow = (await screen.findByText("orders@meatco.test")).closest("tr")!;
    expect(within(meatRow).getByText("Beef, Cheese")).toBeInTheDocument();
    expect(within(screen.getByText("Bakery").closest("tr")!).getAllByText("—")).toHaveLength(2);
    expect(requestedUrls(fetchMock).filter((url) => url.startsWith("/api/ingredients/") && url !== OPTIONS)).toEqual([]);
  });

  it("follows to page 2", async () => {
    const fetchMock = mockApi({ ...base, [`GET ${nthPage(LIST, 2)}`]: page([{ ...bakery, id: 9, name: "Dairy" }], { count: 30 }) });
    renderPage(<SuppliersPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("Dairy")).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain(nthPage(LIST, 2));
  });

  it("searches by name", async () => {
    mockApi({ ...base, [`GET ${searchPage(LIST, "bak")}`]: page([bakery]) });
    renderPage(<SuppliersPage />);
    await userEvent.type(await screen.findByLabelText("Search suppliers"), "bak");
    await waitFor(() => expect(screen.queryByText("Meat Co")).not.toBeInTheDocument());
    expect(screen.getByText("Bakery")).toBeInTheDocument();
  });

  it("creates a supplier with ingredients picked from the options endpoint", async () => {
    const created = { id: 3, name: "Dairy", contact: "", ingredients: [3], supplies: [] };
    const fetchMock = mockApi({ ...base, "POST /api/suppliers/": { status: 201, body: created } });
    renderPage(<SuppliersPage />);
    await userEvent.type(await screen.findByLabelText("Name"), "Dairy");
    await userEvent.click(within(await screen.findByRole("group", { name: "Supplies" })).getByLabelText("Cheese"));
    await userEvent.click(screen.getByRole("button", { name: "Add supplier" }));
    const expected = { name: "Dairy", contact: "", ingredients: [3] };
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", "/api/suppliers/")).toEqual([expected]));
  });

  it("edits the supplied ingredients with PATCH", async () => {
    const updated = { ...meatCo, ingredients: [3, 2] };
    const fetchMock = mockApi({ ...base, "PATCH /api/suppliers/1/": updated });
    renderPage(<SuppliersPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit items for Meat Co" }));
    const checklist = within(await screen.findByRole("group", { name: "Supplies for Meat Co" }));
    await userEvent.click(checklist.getByLabelText("Beef"));
    await userEvent.click(checklist.getByLabelText("Bun"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(bodiesSentTo(fetchMock, "PATCH", "/api/suppliers/1/")).toEqual([{ ingredients: [3, 2] }]));
    await waitFor(() => expect(screen.queryByRole("group", { name: "Supplies for Meat Co" })).not.toBeInTheDocument());
  });

  it("cancels editing without sending anything", async () => {
    const fetchMock = mockApi(base);
    renderPage(<SuppliersPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit items for Bakery" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("group", { name: "Supplies for Bakery" })).not.toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "PATCH", "/api/suppliers/2/")).toEqual([]);
  });
});
