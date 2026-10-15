import { cursorOf } from "../api/client";
import type { CursorPage, Page } from "../api/types";
import { PAGE_SIZE } from "../api/pagination";
import { pageRange } from "../lib/format";
import { Button } from "./Button";

interface PaginationProps {
  summary?: string;
  hasPrevious: boolean;
  hasNext: boolean;
  busy: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function Pagination({ summary, hasPrevious, hasNext, busy, onPrevious, onNext }: PaginationProps) {
  if (!summary && !hasPrevious && !hasNext) return null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
      <p className="tabular-nums">{summary}</p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={busy || !hasPrevious} onClick={onPrevious}>Previous</Button>
        <Button variant="secondary" disabled={busy || !hasNext} onClick={onNext}>Next</Button>
      </div>
    </nav>
  );
}

interface PageNumberPaginationProps {
  page: number;
  data: Page<unknown>;
  busy: boolean;
  onPage: (page: number) => void;
}

export function PageNumberPagination({ page, data, busy, onPage }: PageNumberPaginationProps) {
  return (
    <Pagination summary={pageRange(page, PAGE_SIZE, data.count, data.results.length)} hasPrevious={data.previous !== null} hasNext={data.next !== null}
      busy={busy} onPrevious={() => onPage(page - 1)} onNext={() => onPage(page + 1)} />
  );
}

interface CursorPaginationProps {
  data: CursorPage<unknown>;
  busy: boolean;
  onCursor: (cursor: string | null) => void;
}

export function CursorPagination({ data, busy, onCursor }: CursorPaginationProps) {
  return (
    <Pagination hasPrevious={data.previous !== null} hasNext={data.next !== null} busy={busy}
      onPrevious={() => onCursor(cursorOf(data.previous))} onNext={() => onCursor(cursorOf(data.next))} />
  );
}
