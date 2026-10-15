import type { FormEvent } from "react";
import { UNITS, type Unit } from "../../api/types";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Field, Input, Select } from "../../components/Field";
import { Panel } from "../../components/Page";
import { useFormState } from "../../lib/useFormState";
import { useCreateIngredient } from "./hooks";

export function IngredientForm() {
  const { values, setField, reset } = useFormState({ name: "", unit: "g" as Unit });
  const create = useCreateIngredient();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(values, { onSuccess: reset });
  };
  return (
    <Panel title="New ingredient">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
        <Field label="Name"><Input required value={values.name} onChange={(e) => setField("name", e.target.value)} /></Field>
        <Field label="Unit"><UnitSelect value={values.unit} onChange={(unit) => setField("unit", unit)} /></Field>
        <Button type="submit" disabled={create.isPending}>Add ingredient</Button>
      </form>
      <ErrorBanner error={create.error} />
    </Panel>
  );
}

function UnitSelect({ value, onChange }: { value: Unit; onChange: (unit: Unit) => void }) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as Unit)}>
      {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
    </Select>
  );
}
