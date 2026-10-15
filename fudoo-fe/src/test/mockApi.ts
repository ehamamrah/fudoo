import { vi } from "vitest";

interface MockResponse {
  status?: number;
  body?: unknown;
}

export type Routes = Record<string, unknown>;

type FetchMock = ReturnType<typeof mockApi>;

export const networkError = Symbol("networkError");

class Sequence {
  constructor(private readonly entries: unknown[]) {}

  next(): unknown {
    return this.entries.length > 1 ? this.entries.shift() : this.entries[0];
  }
}

export const inSequence = (...entries: unknown[]) => new Sequence(entries);

const isMockResponse = (value: unknown): value is MockResponse =>
  typeof value === "object" && value !== null && typeof (value as MockResponse).status === "number";

const urlOf = (input: RequestInfo | URL): string => (input instanceof Request ? input.url : input.toString());

const methodOf = (init?: RequestInit): string => init?.method ?? "GET";

function toResponse(entry: unknown): Response {
  const { status = 200, body = null } = isMockResponse(entry) ? entry : { body: entry };
  return new Response(body === null ? null : JSON.stringify(body), { status });
}

function respond(routes: Routes, key: string): Promise<Response> {
  if (!(key in routes)) return Promise.resolve(toResponse({ status: 500, body: { detail: `Unmocked ${key}` } }));
  const route = routes[key];
  const entry = route instanceof Sequence ? route.next() : route;
  if (entry === networkError) return Promise.reject(new TypeError("Failed to fetch"));
  return Promise.resolve(toResponse(entry));
}

export function mockApi(routes: Routes) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    respond(routes, `${methodOf(init)} ${urlOf(input)}`),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function requestsTo(fetchMock: FetchMock, method: string, url: string): RequestInit[] {
  return fetchMock.mock.calls
    .filter(([input, init]) => urlOf(input) === url && methodOf(init) === method)
    .map(([, init]) => init ?? {});
}

export function bodiesSentTo(fetchMock: FetchMock, method: string, url: string): unknown[] {
  return requestsTo(fetchMock, method, url).map((init) => JSON.parse(init.body as string) as unknown);
}

export const requestedUrls = (fetchMock: FetchMock): string[] => fetchMock.mock.calls.map(([input]) => urlOf(input));
