import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bodiesSentTo, inSequence, mockApi, networkError, requestedUrls } from "../../test/mockApi";
import { cursorPage } from "../../test/pages";
import { renderPage } from "../../test/render";
import { stubRandomUuid } from "../../test/uuid";
import { PurchaseOrdersPage } from "./PurchaseOrdersPage";
import { purchaseOrder } from "./fixtures";

const NEXT = "/api/purchase-orders/?cursor=cD0y";
const OPEN_NEXT = "/api/purchase-orders/?cursor=b3Bu&status=open";

const base = {
  "GET /api/suppliers/options/": [
    { id: 2, name: "Bakery" },
    { id: 3, name: "Empty Co" },
    { id: 1, name: "Meat Co" },
  ],
  "GET /api/ingredients/options/?supplier=1": [{ id: 1, name: "Beef", unit: "g" }],
  "GET /api/ingredients/options/?supplier=2": [{ id: 2, name: "Bun", unit: "pcs" }],
  "GET /api/ingredients/options/?supplier=3": [],
  "GET /api/purchase-orders/": cursorPage([purchaseOrder(), purchaseOrder({ id: 8, status: "draft" })], { next: NEXT }),
  [`GET ${NEXT}`]: cursorPage([purchaseOrder({ id: 3, status: "closed" })], { previous: "/api/purchase-orders/?cursor=cj0x" }),
  "GET /api/purchase-orders/?status=open": cursorPage([purchaseOrder()], { next: OPEN_NEXT }),
  "GET /api/purchase-orders/?status=open&cursor=b3Bu": cursorPage([purchaseOrder({ id: 2 })]),
};

const CREATE = "/api/purchase-orders/";

const optionLabels = (select: HTMLElement) => within(select).getAllByRole("option").map((option) => option.textContent);

async function fillLine(supplier: string, ingredient: string, quantity: string) {
  await userEvent.selectOptions(await screen.findByLabelText("Supplier"), supplier);
  await userEvent.selectOptions(await screen.findByLabelText("Ingredient 1"), ingredient);
  await userEvent.type(screen.getByLabelText("Quantity 1"), quantity);
}

const requestIdsSent = (fetchMock: ReturnType<typeof mockApi>) =>
  bodiesSentTo(fetchMock, "POST", CREATE).map((body) => (body as { request_id: string }).request_id);

describe("PurchaseOrdersPage", () => {
  beforeEach(stubRandomUuid);

  it("lists all orders and follows the next link as given", async () => {
    const fetchMock = mockApi(base);
    renderPage(<PurchaseOrdersPage />);
    expect(await screen.findByText("PO #8")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("PO #3")).toBeInTheDocument();
    expect(screen.queryByText("PO #8")).not.toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain(NEXT);
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  it("switches to the open filter from the first page", async () => {
    const fetchMock = mockApi(base);
    renderPage(<PurchaseOrdersPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    await screen.findByText("PO #3");
    await userEvent.click(screen.getByRole("button", { name: "Open (sent / received)" }));
    await waitFor(() => expect(screen.queryByText("PO #3")).not.toBeInTheDocument());
    expect(screen.getByText("PO #7")).toBeInTheDocument();
    expect(screen.getByText(/Updated \d+s ago/)).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain("/api/purchase-orders/?status=open");
    expect(requestedUrls(fetchMock)).not.toContain("/api/purchase-orders/?status=open&cursor=cD0y");
  });

  it("pages through open orders with the cursor token and the status filter", async () => {
    mockApi(base);
    renderPage(<PurchaseOrdersPage />, { route: "/?status=open" });
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(await screen.findByText("PO #2")).toBeInTheDocument();
  });

  it("restores a page from the cursor token in the URL", async () => {
    mockApi(base);
    renderPage(<PurchaseOrdersPage />, { route: "/?cursor=cD0y" });
    expect(await screen.findByText("PO #3")).toBeInTheDocument();
  });

  it("creates a draft order from supplier and lines", async () => {
    const draft = purchaseOrder({ id: 9, status: "draft" });
    const fetchMock = mockApi({ ...base, "POST /api/purchase-orders/": { status: 201, body: draft } });
    renderPage(<PurchaseOrdersPage />, { path: "*" });
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

  it("offers suppliers from the options endpoint", async () => {
    mockApi(base);
    renderPage(<PurchaseOrdersPage />);
    expect(optionLabels(await screen.findByLabelText("Supplier"))).toEqual(["Choose…", "Bakery", "Empty Co", "Meat Co"]);
  });

  it("offers the ingredient options of the chosen supplier and resets lines on supplier change", async () => {
    const fetchMock = mockApi(base);
    renderPage(<PurchaseOrdersPage />);
    await fillLine("1", "1", "5000");
    expect(optionLabels(screen.getByLabelText("Ingredient 1"))).toEqual(["Choose…", "Beef (g)"]);
    await userEvent.selectOptions(screen.getByLabelText("Supplier"), "2");
    expect(optionLabels(await screen.findByLabelText("Ingredient 1"))).toEqual(["Choose…", "Bun (pcs)"]);
    expect(requestedUrls(fetchMock)).toEqual(expect.arrayContaining(["/api/ingredients/options/?supplier=1", "/api/ingredients/options/?supplier=2"]));
    expect(requestedUrls(fetchMock)).not.toContain("/api/ingredients/options/");
    expect(screen.getByLabelText("Ingredient 1")).toHaveValue("");
    expect(screen.getByLabelText("Quantity 1")).toHaveValue(null);
  });

  it("links to the Suppliers page when the supplier supplies nothing", async () => {
    mockApi(base);
    renderPage(<PurchaseOrdersPage />);
    await userEvent.selectOptions(await screen.findByLabelText("Supplier"), "3");
    expect(await screen.findByRole("link", { name: "Set them on the Suppliers page" })).toHaveAttribute("href", "/suppliers");
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
