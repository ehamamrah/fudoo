export const page = <T>(results: T[], overrides: { count?: number; next?: string | null; previous?: string | null } = {}) =>
  ({ count: results.length, next: null, previous: null, results, ...overrides });

export const cursorPage = <T>(results: T[], overrides: { next?: string | null; previous?: string | null } = {}) =>
  ({ next: null, previous: null, results, ...overrides });

export const firstPage = (path: string) => `${path}?page=1&page_size=25`;
export const nthPage = (path: string, n: number) => `${path}?page=${n}&page_size=25`;
export const searchPage = (path: string, search: string) => `${firstPage(path)}&search=${search}`;
