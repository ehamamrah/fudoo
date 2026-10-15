import { ApiError } from "../api/client";
import type { Shortage } from "../api/types";
import { formatQuantity } from "../lib/format";

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function ShortageList({ shortages }: { shortages: Shortage[] }) {
  return (
    <ul className="mt-1 list-disc pl-5">
      {shortages.map((shortage) => (
        <li key={shortage.ingredient}>
          {shortage.name}: required {formatQuantity(shortage.required)}, available {formatQuantity(shortage.available)}
        </li>
      ))}
    </ul>
  );
}

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  const shortages = error instanceof ApiError ? error.shortages : [];
  return (
    <div role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
      <p>{messageOf(error)}</p>
      {shortages.length > 0 && <ShortageList shortages={shortages} />}
    </div>
  );
}
