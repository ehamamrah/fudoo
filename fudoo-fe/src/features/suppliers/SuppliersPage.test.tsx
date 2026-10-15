import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bodiesSentTo, mockApi } from "../../test/mockApi";
import { renderPage } from "../../test/render";
import { SuppliersPage } from "./SuppliersPage";

const ingredients = [
  { id: 1, name: "Beef", unit: "g", on_hand: "0.000" },
  { id: 2, name: "Bun", unit: "pcs", on_hand: "0.000" },
  { id: 3, name: "Cheese", unit: "g", on_hand: "0.000" },
];

const meatCo = { id: 1, name: "Meat Co", contact: "orders@meatco.test", ingredients: [1, 3] };
const bakery = { id: 2, name: "Bakery", contact: "", ingredients: [] };

const base = { "GET /api/ingredients/": ingredients, "GET /api/suppliers/": [meatCo, bakery] };

describe("SuppliersPage", () => {
  it("lists suppliers with the ingredients they supply", async () => {
    mockApi(base);
    renderPage(<SuppliersPage />);
    const meatRow = (await screen.findByText("orders@meatco.test")).closest("tr")!;
    expect(within(meatRow).getByText("Beef, Cheese")).toBeInTheDocument();
    expect(within(screen.getByText("Bakery").closest("tr")!).getAllByText("—")).toHaveLength(2);
  });

  it("creates a supplier with the selected ingredients", async () => {
    const created = { id: 3, name: "Dairy", contact: "", ingredients: [3] };
    const fetchMock = mockApi({ ...base, "POST /api/suppliers/": { status: 201, body: created } });
    renderPage(<SuppliersPage />);
    await userEvent.type(await screen.findByLabelText("Name"), "Dairy");
    await userEvent.click(within(screen.getByRole("group", { name: "Supplies" })).getByLabelText("Cheese"));
    await userEvent.click(screen.getByRole("button", { name: "Add supplier" }));
    const expected = { name: "Dairy", contact: "", ingredients: [3] };
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", "/api/suppliers/")).toEqual([expected]));
  });

  it("edits the supplied ingredients with PATCH", async () => {
    const updated = { ...meatCo, ingredients: [3, 2] };
    const fetchMock = mockApi({ ...base, "PATCH /api/suppliers/1/": updated });
    renderPage(<SuppliersPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit items for Meat Co" }));
    const checklist = within(screen.getByRole("group", { name: "Supplies for Meat Co" }));
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
