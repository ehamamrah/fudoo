import type { ReactNode } from "react";

interface PageProps {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}

export function Page({ title, aside, children }: PageProps) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}
