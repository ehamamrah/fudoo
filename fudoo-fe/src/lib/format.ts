export function formatQuantity(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/0+$/, "").replace(/\.$/, "");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function secondsSince(timestamp: number, now: number): number {
  return Math.max(0, Math.floor((now - timestamp) / 1000));
}

export function isPositiveQuantity(value: string): boolean {
  const trimmed = value.trim();
  return /^\d*\.?\d*$/.test(trimmed) && /[1-9]/.test(trimmed);
}
