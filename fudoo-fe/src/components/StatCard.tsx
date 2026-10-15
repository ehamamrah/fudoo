type StatTone = "default" | "success" | "danger";

const valueTones: Record<StatTone, string> = {
  default: "text-slate-900",
  success: "text-emerald-600",
  danger: "text-red-600",
};

export function StatCard({ label, value, tone = "default" }: { label: string; value: number; tone?: StatTone }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
      <p className={`mt-2 text-2xl font-semibold sm:text-3xl tracking-tight ${valueTones[tone]}`}>{value}</p>
    </div>
  );
}
