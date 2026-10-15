import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bodiesSentTo, inSequence, mockApi, networkError, requestedUrls } from "../../test/mockApi";
import { renderPage } from "../../test/render";
import { stubRandomUuid } from "../../test/uuid";
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

const CREATE = "/api/purchase-orders/";

const optionLabels = (select: HTMLElement) => within(select).getAllByRole("option").map((option) => option.textContent);

async function fillLine(supplier: string, ingredient: string, quantity: string) {
  await userEvent.selectOptions(await screen.findByLabelText("Supplier"), supplier);
  await userEvent.selectOptions(screen.getByLabelText("Ingredient 1"), ingredient);
  await userEvent.type(screen.getByLabelText("Quantity 1"), quantity);
}

const requestIdsSent = (fetchMock: ReturnType<typeof mockApi>) =>
  bodiesSentTo(fetchMock, "POST", CREATE).map((body) => (body as { request_id: string }).request_id);

describe("PurchaseOrdersPage", () => {
  beforeEach(stubRandomUuid);

  it("lists all orders and switches to the open filter", async () => {
    const fetchMock = mockApi(base);
    renderPage(<PurchaseOrdersPage />);
    expect(await screen.findByText("PO #8")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open (sent / received)" }));
    await waitFor(() => expect(screen.queryByText("PO #8")).not.toBeInTheDocument());
    expect(screen.getByText("PO #7")).toBeInTheDocument();
    expect(screen.getByText(/Updated \d+s ago/)).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain("/api/purchase-orders/?status=open");
  });

  it("creates a draft order from supplier and lines", async () => {
    const draft = purchaseOrder({ id: 9, status: "draft" });
    const fetchMock = mockApi({ ...base, "POST /api/purchase-orders/": { status: 201, body: draft } });
    renderPage(<PurchaseOrdersPage />);
    await fillLine("1", "1", "5000");
    await userEvent.click(screen.getByRole("button", { name: "Create purchase order" }));
    const expected = { request_id: "uuid-1", supplier: 1, lines: [{ ingredient: 1, quantity_ordered: "5000" }] };
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", CREATE)).toEqual([expected]));
  });

  it("reuses the request_id when retrying a failed create and renews it after success", async () => {
    const created = { status: 201, body: purchaseOrder({ id: 9, status: "draft" }) };
    const fetchMock = mockApi({ ...base, [`POST ${CREATE}`]: inSequence(networkError, created) });
    renderPage(<PurchaseOrdersPage />, { path: "*" });
    await fillLine("1", "1", "5000");
    const submit = screen.getByRole("button", { name: "Create purchase order" });
    await userEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to fetch");
    await userEvent.click(submit);
    await waitFor(() => expect(requestIdsSent(fetchMock)).toEqual(["uuid-1", "uuid-1"]));
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await waitFor(() => expect(requestIdsSent(fetchMock)).toEqual(["uuid-1", "uuid-1", "uuid-2"]));
  });

  it("shows the idempotency_conflict detail from the API", async () => {
    const detail = "request_id was already used with a different payload.";
    mockApi({ ...base, [`POST ${CREATE}`]: { status: 409, body: { code: "idempotency_conflict", detail } } });
    renderPage(<PurchaseOrdersPage />);
    await fillLine("1", "1", "5000");
    await userEvent.click(screen.getByRole("button", { name: "Create purchase order" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
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
