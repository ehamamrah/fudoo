import { vi } from "vitest";

type Uuid = ReturnType<typeof crypto.randomUUID>;

export function stubRandomUuid() {
  let counter = 0;
  vi.spyOn(crypto, "randomUUID").mockImplementation(() => `uuid-${++counter}` as Uuid);
}
