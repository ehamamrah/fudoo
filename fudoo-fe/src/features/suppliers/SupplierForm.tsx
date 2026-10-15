import { Button } from "../../components/Button";
import { Field, Input } from "../../components/Field";
import { FormPanel } from "../../components/FormPanel";
import { useFormState } from "../../lib/useFormState";
import { useCreateSupplier } from "./hooks";

export function SupplierForm() {
  const { values, setField, reset } = useFormState({ name: "", contact: "" });
  const create = useCreateSupplier();
  return (
    <FormPanel title="New supplier" error={create.error} onSubmit={() => create.mutate(values, { onSuccess: reset })}
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Name"><Input required value={values.name} onChange={(e) => setField("name", e.target.value)} /></Field>
      <Field label="Contact"><Input value={values.contact} onChange={(e) => setField("contact", e.target.value)} /></Field>
      <Button type="submit" disabled={create.isPending}>Add supplier</Button>
    </FormPanel>
  );
}
