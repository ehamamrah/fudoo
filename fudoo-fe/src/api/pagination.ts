import { withQuery } from "./client";
import type { CatalogParams } from "./types";

export const PAGE_SIZE = 25;

export const catalogPath = (path: string, { page, search }: CatalogParams, extra: Record<string, string> = {}) =>
  withQuery(path, { page, page_size: PAGE_SIZE, search, ...extra });
