import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from "react";

interface TableProps {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
}

export function Table({ headers, children, empty = false }: TableProps) {
  return (
    <table className="w-full border-collapse bg-white text-sm shadow-sm">
      <thead className="bg-gray-100 text-left">
        <tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr>
      </thead>
      <tbody>
        {empty ? <EmptyRow span={headers.length} /> : children}
      </tbody>
    </table>
  );
}

function EmptyRow({ span }: { span: number }) {
  return <tr><td colSpan={span} className="px-3 py-4 text-center text-gray-500">Nothing here yet.</td></tr>;
}

export function Row(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="border-t border-gray-200" {...props} />;
}

export function Cell(props: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className="px-3 py-2 align-top" {...props} />;
}
