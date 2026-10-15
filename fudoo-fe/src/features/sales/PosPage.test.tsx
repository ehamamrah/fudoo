import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bodiesSentTo, mockApi } from "../../test/mockApi";
import { renderPage } from "../../test/render";
import { stubRandomUuid } from "../../test/uuid";
import { PosPage } from "./PosPage";

const burger = { id: 1, name: "Classic Burger", recipe: [] };
const sale = { id: 3, external_id: "uuid-1", menu_item: 1, menu_item_name: "Classic Burger", quantity: 2, sold_at: "2026-10-15T12:00:00Z" };
const base = { "GET /api/menu-items/": [burger], "GET /api/sales/": [] };

async function ringUp(quantity: string) {
  await userEvent.selectOptions(await screen.findByLabelText("Menu item"), "1");
  await userEvent.clear(screen.getByLabelText("Quantity"));
  await userEvent.type(screen.getByLabelText("Quantity"), quantity);
  await userEvent.click(screen.getByRole("button", { name: "Record sale" }));
}

describe("PosPage", () => {
  beforeEach(stubRandomUuid);

  it("lists recent sales", async () => {
    mockApi({ ...base, "GET /api/sales/": [sale] });
    renderPage(<PosPage />);
    expect(await screen.findByText("uuid-1", { selector: "td code" })).toBeInTheDocument();
  });

  it("posts a sale with a generated external_id and shows the result", async () => {
    const fetchMock = mockApi({ ...base, "POST /api/sales/": { status: 201, body: sale } });
    renderPage(<PosPage />);
    await ringUp("2");
    expect(await screen.findByRole("status")).toHaveTextContent("Sale #3 recorded: 2 × Classic Burger");
    expect(bodiesSentTo(fetchMock, "POST", "/api/sales/")).toEqual([{ external_id: "uuid-1", menu_item: 1, quantity: 2 }]);
    expect(screen.getByText("uuid-2")).toBeInTheDocument();
  });

  it("lists shortages on insufficient_stock and keeps the external_id", async () => {
    const shortages = [
      { ingredient: 1, name: "Beef", required: "300.000", available: "120.000" },
      { ingredient: 2, name: "Bun", required: "2.000", available: "0.000" },
    ];
    const body = { code: "insufficient_stock", detail: "Not enough stock for this sale.", shortages };
    mockApi({ ...base, "POST /api/sales/": { status: 409, body } });
    renderPage(<PosPage />);
    await ringUp("2");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Not enough stock for this sale.");
    expect(alert).toHaveTextContent("Beef: required 300, available 120");
    expect(alert).toHaveTextContent("Bun: required 2, available 0");
    await waitFor(() => expect(screen.getByText("uuid-1")).toBeInTheDocument());
  });
});
