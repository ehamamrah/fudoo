import { describe, expect, it } from "vitest";
import { isLessThan, isZero, toThousandths } from "./quantity";

describe("quantity", () => {
  it.each([
    ["150.000", 150000n],
    ["0.125", 125n],
    ["12", 12000n],
    ["1.5", 1500n],
    [".5", 500n],
  ])("converts %s to %s thousandths without floats", (value, expected) => {
    expect(toThousandths(value)).toBe(expected);
  });

  it("compares exactly", () => {
    expect(isLessThan("0.1", "0.3")).toBe(true);
    expect(isLessThan("120.000", "120")).toBe(false);
    expect(isLessThan("9999999999999.999", "10000000000000")).toBe(true);
  });

  it("detects zero", () => {
    expect(isZero("0.000")).toBe(true);
    expect(isZero("0.001")).toBe(false);
  });
});
