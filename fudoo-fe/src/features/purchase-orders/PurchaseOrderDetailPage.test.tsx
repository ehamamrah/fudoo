import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PurchaseOrderAction } from "../../api/types";
import { bodiesSentTo, mockApi, type Routes } from "../../test/mockApi";
import { renderPage } from "../../test/render";
import { PurchaseOrderDetailPage } from "./PurchaseOrderDetailPage";
import { purchaseOrder } from "./fixtures";

const DETAIL = "/api/purchase-orders/7/";
const ACTIONS = "/api/purchase-orders/7/actions/";
const DELIVERIES = "/api/purchase-orders/7/deliveries/";
const ALL_LABELS = ["Send to supplier", "Cancel order", "Close (short-close)"];

function renderDetail(routes: Routes) {
  const fetchMock = mockApi(routes);
  renderPage(<PurchaseOrderDetailPage />, { path: "/purchase-orders/:id", route: "/purchase-orders/7" });
  return fetchMock;
}

function actionButtonLabels(): string[] {
  return ALL_LABELS.filter((label) => screen.queryByRole("button", { name: label }));
}

describe("PurchaseOrderDetailPage", () => {
  it("shows ordered, received and outstanding quantities from the API", async () => {
    renderDetail({ [`GET ${DETAIL}`]: purchaseOrder() });
    expect(await screen.findByText("Meat Co")).toBeInTheDocument();
    expect(screen.getByText("5000 g")).toBeInTheDocument();
    expect(screen.getByText("3000 g")).toBeInTheDocument();
    expect(screen.getByText("2000 g")).toBeInTheDocument();
  });

  it.each<[PurchaseOrderAction[], string[]]>([
    [["send", "cancel"], ["Send to supplier", "Cancel order"]],
    [["cancel"], ["Cancel order"]],
    [["close"], ["Close (short-close)"]],
    [[], []],
  ])("renders exactly the buttons for allowed_actions %j", async (allowed, labels) => {
    renderDetail({ [`GET ${DETAIL}`]: purchaseOrder({ allowed_actions: allowed }) });
    await screen.findByText("Meat Co");
    expect(actionButtonLabels()).toEqual(labels);
  });

  it("posts the chosen action", async () => {
    const order = purchaseOrder({ status: "draft", allowed_actions: ["send", "cancel"] });
    const fetchMock = renderDetail({ [`GET ${DETAIL}`]: order, [`POST ${ACTIONS}`]: purchaseOrder({ status: "sent" }) });
    await userEvent.click(await screen.findByRole("button", { name: "Send to supplier" }));
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", ACTIONS)).toEqual([{ action: "send" }]));
  });

  it("shows invalid_transition errors verbatim", async () => {
    const error = { status: 409, body: { code: "invalid_transition", detail: "Cannot close a draft order." } };
    renderDetail({ [`GET ${DETAIL}`]: purchaseOrder(), [`POST ${ACTIONS}`]: error });
    await userEvent.click(await screen.findByRole("button", { name: "Close (short-close)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot close a draft order.");
  });

  it("hides the receive form for draft orders", async () => {
    renderDetail({ [`GET ${DETAIL}`]: purchaseOrder({ status: "draft", allowed_actions: ["send", "cancel"] }) });
    await screen.findByText("Meat Co");
    expect(screen.queryByRole("button", { name: "Record delivery" })).not.toBeInTheDocument();
  });
});

describe("ReceiveForm", () => {
  it("prefills each line with its outstanding quantity", async () => {
    renderDetail({ [`GET ${DETAIL}`]: purchaseOrder() });
    expect(await screen.findByLabelText("Receive Beef")).toHaveValue(2000);
    expect(screen.getByLabelText("Receive Bun")).toHaveValue(60);
  });

  it("posts only lines with a quantity above zero", async () => {
    const fetchMock = renderDetail({ [`GET ${DETAIL}`]: purchaseOrder(), [`POST ${DELIVERIES}`]: { status: 201, body: purchaseOrder() } });
    const bun = await screen.findByLabelText("Receive Bun");
    await userEvent.clear(bun);
    await userEvent.type(bun, "0");
    await userEvent.clear(screen.getByLabelText("Receive Beef"));
    await userEvent.type(screen.getByLabelText("Receive Beef"), "1500.5");
    await userEvent.click(screen.getByRole("button", { name: "Record delivery" }));
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", DELIVERIES)).toEqual([{ lines: [{ line: 11, quantity: "1500.5" }] }]));
  });

  it("disables submit when every quantity is empty or zero", async () => {
    renderDetail({ [`GET ${DETAIL}`]: purchaseOrder() });
    await userEvent.clear(await screen.findByLabelText("Receive Beef"));
    await userEvent.clear(screen.getByLabelText("Receive Bun"));
    expect(screen.getByRole("button", { name: "Record delivery" })).toBeDisabled();
  });

  it("shows over_receipt errors verbatim", async () => {
    const error = { status: 409, body: { code: "over_receipt", detail: "Beef: 2500 exceeds outstanding 2000." } };
    renderDetail({ [`GET ${DETAIL}`]: purchaseOrder(), [`POST ${DELIVERIES}`]: error });
    await userEvent.click(await screen.findByRole("button", { name: "Record delivery" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Beef: 2500 exceeds outstanding 2000.");
  });
});
