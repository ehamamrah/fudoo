import type { Ingredient } from "../../api/types";
import { Button } from "../../components/Button";
import { Field, Input } from "../../components/Field";
import { FormPanel } from "../../components/FormPanel";
import { useFormState } from "../../lib/useFormState";
import { IngredientChecklist } from "../ingredients/IngredientChecklist";
import { useCreateSupplier } from "./hooks";

const blankSupplier = { name: "", contact: "", ingredients: [] as number[] };

export function SupplierForm({ ingredients }: { ingredients: Ingredient[] }) {
  const { values, setField, reset } = useFormState(blankSupplier);
  const create = useCreateSupplier();
  return (
    <FormPanel title="New supplier" error={create.error} onSubmit={() => create.mutate(values, { onSuccess: reset })}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><Input required value={values.name} onChange={(e) => setField("name", e.target.value)} /></Field>
        <Field label="Contact"><Input value={values.contact} onChange={(e) => setField("contact", e.target.value)} /></Field>
      </div>
      <IngredientChecklist label="Supplies" ingredients={ingredients} selected={values.ingredients}
        onChange={(selected) => setField("ingredients", selected)} />
      <Button type="submit" className="self-start" disabled={create.isPending}>Add supplier</Button>
    </FormPanel>
  );
}
