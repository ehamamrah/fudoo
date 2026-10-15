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

export function UpdatedAgo({ updatedAt }: { updatedAt: number }) {
  const now = useNow(1000);
  if (!updatedAt) return <span className="text-sm text-gray-500">Loading…</span>;
  return <span className="text-sm text-gray-500">Updated {secondsSince(updatedAt, now)}s ago</span>;
}
