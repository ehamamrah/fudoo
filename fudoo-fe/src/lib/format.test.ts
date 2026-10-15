import { describe, expect, it } from "vitest";
import { formatQuantity, secondsSince } from "./format";

describe("formatQuantity", () => {
  it.each([
    ["150.000", "150"],
    ["1.500", "1.5"],
    ["0.000", "0"],
    ["0.125", "0.125"],
    ["5000", "5000"],
    ["10.010", "10.01"],
  ])("trims %s to %s", (input, expected) => {
    expect(formatQuantity(input)).toBe(expected);
  });
});

describe("secondsSince", () => {
  it("floors elapsed seconds and never goes negative", () => {
    expect(secondsSince(1000, 4900)).toBe(3);
    expect(secondsSince(5000, 4000)).toBe(0);
  });
});
