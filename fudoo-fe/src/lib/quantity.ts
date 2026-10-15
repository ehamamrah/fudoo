const SCALE = 3;

export function toThousandths(value: string): bigint {
  const [whole, fraction = ""] = value.trim().split(".");
  return BigInt(`${whole || "0"}${fraction.padEnd(SCALE, "0").slice(0, SCALE)}`);
}

export function isLessThan(left: string, right: string): boolean {
  return toThousandths(left) < toThousandths(right);
}

export function isZero(value: string): boolean {
  return toThousandths(value) === 0n;
}
