import type { Shortage } from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    readonly detail: string,
    readonly shortages: Shortage[] = [],
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

type Body = Record<string, unknown>;

const isRecord = (value: unknown): value is Body =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function fieldPath(path: string, key: string): string {
  if (key === "non_field_errors") return path;
  return path ? `${path}.${key}` : key;
}

function flattenErrors(value: unknown, path: string): string[] {
  if (typeof value === "string") return [path ? `${path}: ${value}` : value];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      flattenErrors(item, isRecord(item) ? `${path} ${index + 1}` : path),
    );
  }
  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, item]) => flattenErrors(item, fieldPath(path, key)));
  }
  return [];
}

function describe(status: number, body: unknown): string {
  if (isRecord(body) && typeof body.detail === "string") return body.detail;
  const messages = flattenErrors(body, "");
  return messages.length > 0 ? messages.join("; ") : `Request failed with status ${status}`;
}

export function toApiError(status: number, body: unknown): ApiError {
  const code = isRecord(body) && typeof body.code === "string" ? body.code : null;
  const shortages = isRecord(body) && Array.isArray(body.shortages) ? (body.shortages as Shortage[]) : [];
  return new ApiError(status, code, describe(status, body), shortages);
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...init.headers },
  });
  const body = await readBody(response);
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}

export const get = <T>(path: string) => request<T>(path);

export const post = <T>(path: string, payload: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(payload) });
