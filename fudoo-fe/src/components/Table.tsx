import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from "react";

interface TableProps {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
  emptyText?: string;
}

export function Table({ headers, children, empty = false, emptyText = "Nothing here yet." }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-xs ring-1 ring-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>{headers.map((header) => <HeaderCell key={header}>{header}</HeaderCell>)}</tr>
        </thead>
        <tbody>{empty ? <EmptyRow span={headers.length} text={emptyText} /> : children}</tbody>
      </table>
    </div>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</th>;
}

function EmptyRow({ span, text }: { span: number; text: string }) {
  return <tr><td colSpan={span} className="px-4 py-10 text-center text-slate-400">{text}</td></tr>;
}

export function Row({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`border-t border-slate-100 transition-colors hover:bg-slate-50/70 ${className}`} {...props} />;
}

export function Cell({ className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3 align-middle text-slate-700 ${className}`} {...props} />;
}
