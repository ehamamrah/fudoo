import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bodiesSentTo, mockApi } from "../../test/mockApi";
import { renderPage } from "../../test/render";
import { PurchaseOrdersPage } from "./PurchaseOrdersPage";
import { purchaseOrder } from "./fixtures";

const base = {
  "GET /api/suppliers/": [{ id: 1, name: "Meat Co", contact: "" }],
  "GET /api/ingredients/": [{ id: 1, name: "Beef", unit: "g", on_hand: "0.000" }],
  "GET /api/purchase-orders/": [purchaseOrder(), purchaseOrder({ id: 8, status: "draft" })],
  "GET /api/purchase-orders/?status=open": [purchaseOrder()],
};

describe("PurchaseOrdersPage", () => {
  it("lists all orders and switches to the open filter", async () => {
    const fetchMock = mockApi(base);
    renderPage(<PurchaseOrdersPage />);
    expect(await screen.findByText("PO #8")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open (sent / received)" }));
    await waitFor(() => expect(screen.queryByText("PO #8")).not.toBeInTheDocument());
    expect(screen.getByText("PO #7")).toBeInTheDocument();
    expect(screen.getByText(/Updated \d+s ago/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain("/api/purchase-orders/?status=open");
  });

  it("creates a draft order from supplier and lines", async () => {
    const draft = purchaseOrder({ id: 9, status: "draft" });
    const fetchMock = mockApi({ ...base, "POST /api/purchase-orders/": { status: 201, body: draft } });
    renderPage(<PurchaseOrdersPage />);
    await userEvent.selectOptions(await screen.findByLabelText("Supplier"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Ingredient 1"), "1");
    await userEvent.type(screen.getByLabelText("Quantity 1"), "5000");
    await userEvent.click(screen.getByRole("button", { name: "Create purchase order" }));
    const expected = { supplier: 1, lines: [{ ingredient: 1, quantity_ordered: "5000" }] };
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", "/api/purchase-orders/")).toEqual([expected]));
  });
});
