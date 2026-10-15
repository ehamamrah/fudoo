import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bodiesSentTo, mockApi } from "../../test/mockApi";
import { renderPage } from "../../test/render";
import { SuppliersPage } from "./SuppliersPage";

describe("SuppliersPage", () => {
  it("lists suppliers and creates a new one", async () => {
    const created = { id: 2, name: "Bakery", contact: "" };
    const fetchMock = mockApi({
      "GET /api/suppliers/": [{ id: 1, name: "Meat Co", contact: "orders@meatco.test" }],
      "POST /api/suppliers/": { status: 201, body: created },
    });
    renderPage(<SuppliersPage />);
    expect(await screen.findByText("orders@meatco.test")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "Bakery");
    await userEvent.click(screen.getByRole("button", { name: "Add supplier" }));
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", "/api/suppliers/")).toEqual([{ name: "Bakery", contact: "" }]));
  });
});
