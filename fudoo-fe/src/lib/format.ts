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

export function pageRange(page: number, pageSize: number, count: number, shown: number): string | undefined {
  if (count === 0) return undefined;
  const first = (page - 1) * pageSize + 1;
  return `${first}–${first + shown - 1} of ${count}`;
}

export const noMatchesText = (search: string) => (search ? `No matches for “${search}”.` : undefined);

export function isEmptyOrZero(value: string): boolean {
  return /^0*\.?0*$/.test(value.trim());
}
