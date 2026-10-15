import { vi } from "vitest";

export interface MockResponse {
  status?: number;
  body?: unknown;
}

export type Routes = Record<string, unknown>;

const isMockResponse = (value: unknown): value is MockResponse =>
  typeof value === "object" && value !== null && typeof (value as MockResponse).status === "number";

function toResponse(entry: unknown): Response {
  const { status = 200, body = null } = isMockResponse(entry) ? entry : { body: entry };
  return new Response(body === null ? null : JSON.stringify(body), { status });
}

export function mockApi(routes: Routes) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${String(input)}`;
    if (!(key in routes)) return new Response(JSON.stringify({ detail: `Unmocked ${key}` }), { status: 500 });
    return toResponse(routes[key]);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function bodiesSentTo(fetchMock: ReturnType<typeof mockApi>, method: string, url: string): unknown[] {
  return fetchMock.mock.calls
    .filter(([input, init]) => String(input) === url && (init?.method ?? "GET") === method)
    .map(([, init]) => JSON.parse(String(init?.body)));
}
