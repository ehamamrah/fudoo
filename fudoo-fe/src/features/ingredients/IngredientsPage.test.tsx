import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { bodiesSentTo, mockApi } from "../../test/mockApi";
import { renderPage } from "../../test/render";
import { IngredientsPage } from "./IngredientsPage";

const beef = { id: 1, name: "Beef", unit: "g", on_hand: "1500.000" };

describe("IngredientsPage", () => {
  it("lists ingredients with trimmed on-hand quantities", async () => {
    mockApi({ "GET /api/ingredients/": [beef] });
    renderPage(<IngredientsPage />);
    expect(await screen.findByText("Beef")).toBeInTheDocument();
    expect(screen.getByText("1500 g")).toBeInTheDocument();
  });

  it("creates an ingredient with the chosen unit", async () => {
    const fetchMock = mockApi({ "GET /api/ingredients/": [], "POST /api/ingredients/": { status: 201, body: beef } });
    renderPage(<IngredientsPage />);
    await userEvent.type(screen.getByLabelText("Name"), "Milk");
    await userEvent.selectOptions(screen.getByLabelText("Unit"), "ml");
    await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST", "/api/ingredients/")).toEqual([{ name: "Milk", unit: "ml" }]));
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
  });

  it("shows validation errors from the API", async () => {
    const body = { name: ["ingredient with this name already exists."] };
    mockApi({ "GET /api/ingredients/": [], "POST /api/ingredients/": { status: 400, body } });
    renderPage(<IngredientsPage />);
    await userEvent.type(screen.getByLabelText("Name"), "Beef");
    await userEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("name: ingredient with this name already exists.");
  });
});
