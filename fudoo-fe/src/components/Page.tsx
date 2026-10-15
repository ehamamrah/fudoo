import type { ReactNode } from "react";

interface PageProps {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}

export function Page({ title, description, aside, children }: PageProps) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-xs ring-1 ring-slate-200 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}
