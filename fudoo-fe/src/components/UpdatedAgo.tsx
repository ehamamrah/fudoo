import { useEffect, useState } from "react";
import { secondsSince } from "../lib/format";

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function LiveDot() {
  return (
    <span aria-hidden="true" className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

export function UpdatedAgo({ updatedAt }: { updatedAt: number }) {
  const now = useNow(1000);
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs ring-1 ring-slate-200">
      <LiveDot />
      <span>{updatedAt ? `Updated ${secondsSince(updatedAt, now)}s ago` : "Loading…"}</span>
    </span>
  );
}
