import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bodiesSentTo, mockApi } from "../../test/mockApi";
import { renderPage } from "../../test/render";
import { PurchaseOrdersPage } from "./PurchaseOrdersPage";
import { purchaseOrder } from "./fixtures";

const base = {
  "GET /api/suppliers/": [
    { id: 1, name: "Meat Co", contact: "", ingredients: [1] },
    { id: 2, name: "Bakery", contact: "", ingredients: [2] },
    { id: 3, name: "Empty Co", contact: "", ingredients: [] },
  ],
  "GET /api/ingredients/": [
    { id: 1, name: "Beef", unit: "g", on_hand: "0.000" },
    { id: 2, name: "Bun", unit: "pcs", on_hand: "0.000" },
  ],
  "GET /api/purchase-orders/": [purchaseOrder(), purchaseOrder({ id: 8, status: "draft" })],
  "GET /api/purchase-orders/?status=open": [purchaseOrder()],
};

const optionLabels = (select: HTMLElement) => within(select).getAllByRole("option").map((option) => option.textContent);

async function fillLine(supplier: string, ingredient: string, quantity: string) {
  await userEvent.selectOptions(await screen.findByLabelText("Supplier"), supplier);
  await userEvent.selectOptions(screen.getByLabelText("Ingredient 1"), ingredient);
  await userEvent.type(screen.getByLabelText("Quantity 1"), quantity);
}

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
    await fillLine("1", "1", "5000");
    await userEvent.click(screen.getByRole("button", { name: "Create purchase order" }));
    const expected = { supplier: 1, lines: [{ ingredient: 1, quantity_ordered: "5000" }] };
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", "/api/purchase-orders/")).toEqual([expected]));
  });

  it("asks for a supplier before offering ingredients", async () => {
    mockApi(base);
    renderPage(<PurchaseOrdersPage />);
    expect(await screen.findByText("Choose a supplier first.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ingredient 1")).not.toBeInTheDocument();
  });

  it("offers only the selected supplier's ingredients and resets lines on supplier change", async () => {
    mockApi(base);
    renderPage(<PurchaseOrdersPage />);
    await fillLine("1", "1", "5000");
    expect(optionLabels(screen.getByLabelText("Ingredient 1"))).toEqual(["Choose…", "Beef (g)"]);
    await userEvent.selectOptions(screen.getByLabelText("Supplier"), "2");
    expect(optionLabels(screen.getByLabelText("Ingredient 1"))).toEqual(["Choose…", "Bun (pcs)"]);
    expect(screen.getByLabelText("Ingredient 1")).toHaveValue("");
    expect(screen.getByLabelText("Quantity 1")).toHaveValue(null);
  });

  it("links to the Suppliers page when the supplier supplies nothing", async () => {
    mockApi(base);
    renderPage(<PurchaseOrdersPage />);
    await userEvent.selectOptions(await screen.findByLabelText("Supplier"), "3");
    expect(screen.getByRole("link", { name: "Set them on the Suppliers page" })).toHaveAttribute("href", "/suppliers");
    expect(screen.getByRole("button", { name: "Create purchase order" })).toBeDisabled();
  });

  it("shows the ingredient_not_supplied detail from the API", async () => {
    const detail = "Meat Co does not supply: Beef.";
    const conflict = { status: 409, body: { code: "ingredient_not_supplied", detail } };
    mockApi({ ...base, "POST /api/purchase-orders/": conflict });
    renderPage(<PurchaseOrdersPage />);
    await fillLine("1", "1", "5000");
    await userEvent.click(screen.getByRole("button", { name: "Create purchase order" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
  });
});
