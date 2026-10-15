import type { FormEvent, ReactNode } from "react";
import { ErrorBanner } from "./ErrorBanner";
import { Panel } from "./Page";

interface FormPanelProps {
  title: string;
  error: unknown;
  onSubmit: () => void;
  className?: string;
  children: ReactNode;
}

export function FormPanel({ title, error, onSubmit, className = "flex flex-col gap-3", children }: FormPanelProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <Panel title={title}>
      <form onSubmit={submit} className={className}>{children}</form>
      <ErrorBanner error={error} />
    </Panel>
  );
}
