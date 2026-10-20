import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { bodiesSentTo, inSequence, mockApi, networkError, requestedUrls, requestsTo } from "../../test/mockApi";
import { cursorPage } from "../../test/pages";
import { renderPage } from "../../test/render";
import { stubRandomUuid } from "../../test/uuid";
import { PosPage } from "./PosPage";

const ORDERS = "/api/orders/";
const NEXT = "/api/orders/?cursor=cD0y";
const menuItems = [{ id: 1, name: "Classic Burger" }, { id: 4, name: "Cola" }];
const addOns = [{ id: 1, name: "Extra cheese" }, { id: 2, name: "Bacon" }];
const base = { "GET /api/menu-items/options/": menuItems, "GET /api/add-ons/options/": addOns, [`GET ${ORDERS}`]: cursorPage([]) };
const cheddarShort = { ingredient: 3, name: "Cheddar", required: "2.000", available: "1.000" };
const beefShort = { ingredient: 1, name: "Beef", required: "150.000", available: "0.000" };

const addOn = (overrides = {}) =>
  ({ id: 3, add_on: 1, add_on_name: "Extra cheese", quantity: 1, status: "fulfilled", shortages: [], ...overrides });
const line = (overrides = {}) =>
  ({ id: 12, menu_item: 1, menu_item_name: "Classic Burger", quantity: 2, status: "fulfilled", shortages: [], add_ons: [], ...overrides });
const order = (overrides = {}) =>
  ({ id: 7, external_id: "uuid-1", status: "completed", ordered_at: "2026-10-20T12:00:00Z", lines: [line()], ...overrides });

const partialOrder = order({
  status: "partial",
  lines: [
    line({ add_ons: [addOn({ status: "skipped", shortages: [cheddarShort] })] }),
    line({ id: 13, menu_item: 4, menu_item_name: "Cola", quantity: 1, status: "skipped", shortages: [beefShort], add_ons: [addOn({ id: 4, add_on: 2, add_on_name: "Bacon", status: "skipped" })] }),
  ],
});

const threeLineOrder = {
  external_id: "uuid-1",
  lines: [
    { menu_item: 1, quantity: 2, add_ons: [{ add_on: 1, quantity: 1 }, { add_on: 2, quantity: 3 }] },
    { menu_item: 4, quantity: 1, add_ons: [] },
    { menu_item: 1, quantity: 5, add_ons: [] },
  ],
};

async function setCount(label: string, value: string) {
  await userEvent.clear(screen.getByLabelText(label));
  await userEvent.type(screen.getByLabelText(label), value);
}

async function fillLine(position: number, menuItem: string, quantity: string) {
  await userEvent.selectOptions(await screen.findByLabelText(`Menu item ${position}`), menuItem);
  await setCount(`Quantity ${position}`, quantity);
}

async function addAddOn(position: number, index: number, id: string, quantity: string) {
  await userEvent.click(screen.getByRole("button", { name: `Add add-on to line ${position}` }));
  await userEvent.selectOptions(screen.getByLabelText(`Add-on ${position}.${index}`), id);
  await setCount(`Add-on ${position}.${index} quantity`, quantity);
}

async function placeOneBurger() {
  await fillLine(1, "1", "1");
  await userEvent.click(screen.getByRole("button", { name: "Place order" }));
}

const lineItem = (scope: HTMLElement, text: string) => within(scope).getByText(text).closest("li") as HTMLElement;
const externalIdsSent = (fetchMock: ReturnType<typeof mockApi>) =>
  bodiesSentTo(fetchMock, "POST", ORDERS).map((body) => (body as { external_id: string }).external_id);

describe("PosPage cart", () => {
  beforeEach(stubRandomUuid);

  it("offers menu items and add-ons from the options endpoints", async () => {
    const fetchMock = mockApi(base);
    renderPage(<PosPage />);
    expect(await screen.findByRole("option", { name: "Classic Burger" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add add-on to line 1" }));
    expect(screen.getByRole("option", { name: "Bacon" })).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).not.toContain("/api/menu-items/");
  });

  it("sends the lines in cart order with add-ons per line and integer quantities", async () => {
    const fetchMock = mockApi({ ...base, [`POST ${ORDERS}`]: { status: 201, body: order() } });
    renderPage(<PosPage />);
    await fillLine(1, "1", "2");
    await addAddOn(1, 1, "1", "1");
    await addAddOn(1, 2, "2", "3");
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    await fillLine(2, "4", "1");
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    await fillLine(3, "1", "5");
    await userEvent.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", ORDERS)).toEqual([threeLineOrder]));
  });

  it("drops removed lines and add-ons from the request", async () => {
    const fetchMock = mockApi({ ...base, [`POST ${ORDERS}`]: { status: 201, body: order() } });
    renderPage(<PosPage />);
    await fillLine(1, "1", "2");
    await addAddOn(1, 1, "1", "1");
    await addAddOn(1, 2, "2", "2");
    await userEvent.click(screen.getByRole("button", { name: "Remove add-on 1.1" }));
    await userEvent.click(screen.getByRole("button", { name: "Add line" }));
    await fillLine(2, "4", "3");
    await userEvent.click(screen.getByRole("button", { name: "Remove line 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Place order" }));
    const expected = { external_id: "uuid-1", lines: [{ menu_item: 4, quantity: 3, add_ons: [] }] };
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", ORDERS)).toEqual([expected]));
  });

  it("keeps at least one line", async () => {
    mockApi(base);
    renderPage(<PosPage />);
    expect(await screen.findByRole("button", { name: "Remove line 1" })).toBeDisabled();
  });

  it("renders a partial result with skipped lines and add-ons and their shortages", async () => {
    mockApi({ ...base, [`POST ${ORDERS}`]: { status: 201, body: partialOrder } });
    renderPage(<PosPage />);
    await placeOneBurger();
    const result = await screen.findByRole("status");
    expect(result).toHaveTextContent("Order #7 recorded");
    expect(within(result).getAllByText("partial")).toHaveLength(1);
    expect(lineItem(result, "+ 1 × Extra cheese")).toHaveTextContent("skipped");
    expect(lineItem(result, "+ 1 × Extra cheese")).toHaveTextContent("Cheddar: required 2, available 1");
    expect(lineItem(result, "1 × Cola")).toHaveTextContent("skippedBeef: required 150, available 0");
    expect(lineItem(result, "+ 1 × Bacon")).toHaveTextContent(/^\+ 1 × Baconskipped$/);
    expect(within(result).getByText("2 × Classic Burger").nextElementSibling).toHaveTextContent("fulfilled");
  });

  it("lists every shortage on insufficient_stock", async () => {
    const shortages = [beefShort, { ingredient: 2, name: "Bun", required: "2.000", available: "0.000" }];
    const body = { code: "insufficient_stock", detail: "No line of this order can be fulfilled.", shortages };
    mockApi({ ...base, [`POST ${ORDERS}`]: { status: 409, body } });
    renderPage(<PosPage />);
    await placeOneBurger();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No line of this order can be fulfilled.");
    expect(alert).toHaveTextContent("Beef: required 150, available 0");
    expect(alert).toHaveTextContent("Bun: required 2, available 0");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows other errors from detail verbatim", async () => {
    const body = { code: "idempotency_conflict", detail: "This external_id was already used for a different order." };
    mockApi({ ...base, [`POST ${ORDERS}`]: { status: 409, body } });
    renderPage(<PosPage />);
    await placeOneBurger();
    expect(await screen.findByRole("alert")).toHaveTextContent("This external_id was already used for a different order.");
  });

  it("reuses the external_id on a retry after failure and renews it after success", async () => {
    const posts = inSequence(networkError, { status: 201, body: order() }, { status: 201, body: order({ id: 8, external_id: "uuid-2" }) });
    const fetchMock = mockApi({ ...base, [`POST ${ORDERS}`]: posts });
    renderPage(<PosPage />);
    await placeOneBurger();
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to fetch");
    await userEvent.click(screen.getByRole("button", { name: "Place order" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Order #7 recorded");
    expect(screen.getByText("uuid-2")).toBeInTheDocument();
    await placeOneBurger();
    await waitFor(() => expect(externalIdsSent(fetchMock)).toEqual(["uuid-1", "uuid-1", "uuid-2"]));
  });

  it("clears the cart and refetches recent orders after an order is recorded", async () => {
    const fetchMock = mockApi({ ...base, [`POST ${ORDERS}`]: { status: 201, body: order() } });
    renderPage(<PosPage />);
    await placeOneBurger();
    await screen.findByRole("status");
    expect(screen.getByLabelText("Menu item 1")).toHaveValue("");
    await waitFor(() => expect(requestsTo(fetchMock, "GET", ORDERS)).toHaveLength(2));
  });
});

describe("PosPage recent orders", () => {
  it("lists orders with status, lines and add-ons and follows the next cursor", async () => {
    const recent = order({ external_id: "pos-new", lines: [line({ add_ons: [addOn()] })] });
    const older = order({ id: 1, external_id: "pos-old", lines: [line({ id: 2, menu_item_name: "Cola", quantity: 1 })] });
    const fetchMock = mockApi({ ...base, [`GET ${ORDERS}`]: cursorPage([recent], { next: NEXT }), [`GET ${NEXT}`]: cursorPage([older]) });
    renderPage(<PosPage />);
    const row = (await screen.findByText("pos-new")).closest("tr") as HTMLElement;
    expect(row).toHaveTextContent("completed");
    expect(lineItem(row, "2 × Classic Burger")).toHaveTextContent("+ 1 × Extra cheesefulfilled");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("pos-old")).toBeInTheDocument();
    expect(screen.getByText("1 × Cola")).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain(NEXT);
  });
});
