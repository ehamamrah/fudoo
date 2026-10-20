import { describe, expect, it } from "vitest";
import { ApiError, cursorOf, get, post, withQuery } from "./client";
import { mockApi } from "../test/mockApi";

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("expected rejection");
}

describe("api client", () => {
  it("returns parsed JSON on success", async () => {
    mockApi({ "GET /api/ingredients/": [{ id: 1, name: "Beef", unit: "g", on_hand: "0.000" }] });
    await expect(get("/ingredients/")).resolves.toEqual([{ id: 1, name: "Beef", unit: "g", on_hand: "0.000" }]);
  });

  it("sends JSON bodies on POST", async () => {
    const fetchMock = mockApi({ "POST /api/suppliers/": { status: 201, body: { id: 1 } } });
    await post("/suppliers/", { name: "Meat Co" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.body).toBe(JSON.stringify({ name: "Meat Co" }));
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });

  it("maps a 409 insufficient_stock body to ApiError with code, detail and shortages", async () => {
    const shortages = [{ ingredient: 1, name: "Beef", required: "300.000", available: "120.000" }];
    const body = { code: "insufficient_stock", detail: "Not enough stock.", shortages };
    mockApi({ "POST /api/orders/": { status: 409, body } });
    const error = await caught(post("/orders/", {}));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "insufficient_stock", detail: "Not enough stock.", shortages });
    expect(error.message).toBe("Not enough stock.");
  });

  it("maps a 409 without shortages to an empty list", async () => {
    mockApi({ "POST /api/purchase-orders/7/actions/": { status: 409, body: { code: "invalid_transition", detail: "Nope." } } });
    const error = await caught(post("/purchase-orders/7/actions/", { action: "send" }));
    expect(error).toMatchObject({ status: 409, code: "invalid_transition", detail: "Nope.", shortages: [] });
  });

  it("flattens DRF field errors from a 400 into the detail", async () => {
    const body = { name: ["This field must be unique."], lines: [{}, { quantity_ordered: ["Must be > 0."] }] };
    mockApi({ "POST /api/purchase-orders/": { status: 400, body } });
    const error = await caught(post("/purchase-orders/", {}));
    expect(error).toMatchObject({ status: 400, code: null });
    expect(error.detail).toBe("name: This field must be unique.; lines 2.quantity_ordered: Must be > 0.");
  });

  it("uses non_field_errors without a prefix", async () => {
    mockApi({ "POST /api/menu-items/": { status: 400, body: { non_field_errors: ["Duplicate ingredient."] } } });
    expect((await caught(post("/menu-items/", {}))).detail).toBe("Duplicate ingredient.");
  });

  it("uses the 404 detail", async () => {
    mockApi({ "GET /api/purchase-orders/99/": { status: 404, body: { detail: "Not found." } } });
    expect((await caught(get("/purchase-orders/99/")))).toMatchObject({ status: 404, detail: "Not found." });
  });

  it("falls back to a status message for empty error bodies", async () => {
    mockApi({ "GET /api/orders/": { status: 502 } });
    expect((await caught(get("/orders/"))).detail).toBe("Request failed with status 502");
  });
});

describe("pagination helpers", () => {
  it("builds query strings without empty values", () => {
    expect(withQuery("/ingredients/", { page: 2, search: "", stock: undefined, supplier: null })).toBe("/ingredients/?page=2");
    expect(withQuery("/ingredients/options/", {})).toBe("/ingredients/options/");
  });

  it.each([
    ["/api/orders/?cursor=cD0y", "cD0y"],
    ["/api/purchase-orders/?cursor=x%3D&status=open", "x="],
    ["/api/orders/", null],
    [null, null],
  ])("reads the cursor token from %s", (link, token) => {
    expect(cursorOf(link)).toBe(token);
  });
});
