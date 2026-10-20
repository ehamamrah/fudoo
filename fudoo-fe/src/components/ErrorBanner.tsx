import { ApiError } from "../api/client";
import type { Shortage } from "../api/types";
import { formatQuantity } from "../lib/format";

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export function ShortageList({ shortages }: { shortages: Shortage[] }) {
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
    <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-200">
      <p>{messageOf(error)}</p>
      {shortages.length > 0 && <ShortageList shortages={shortages} />}
    </div>
  );
}
