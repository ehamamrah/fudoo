import type { ReactNode } from "react";

export type Tone = "gray" | "blue" | "amber" | "green" | "red";

const tones: Record<Tone, string> = {
  gray: "bg-slate-50 text-slate-600 ring-slate-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-700/15",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/15",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function StatusBadge<S extends string>({ status, tones }: { status: S; tones: Record<S, Tone> }) {
  return <Badge tone={tones[status]}><span className="capitalize">{status}</span></Badge>;
}
