import { useState } from "react";
import type { Ingredient, MenuItemInput } from "../../api/types";
import { Button } from "../../components/Button";
import { Field, Input } from "../../components/Field";
import { FormPanel } from "../../components/FormPanel";
import { IngredientLines } from "../ingredients/IngredientLines";
import { useLineDrafts, type LineDraft } from "../ingredients/useLineDrafts";
import { useCreateMenuItem } from "./hooks";

function toInput(name: string, lines: LineDraft[]): MenuItemInput {
  return { name, recipe: lines.map((line) => ({ ingredient: Number(line.ingredient), quantity: line.quantity })) };
}

function useMenuItemForm() {
  const [name, setName] = useState("");
  const drafts = useLineDrafts();
  const create = useCreateMenuItem();
  const reset = () => { setName(""); drafts.reset(); };
  const submit = () => create.mutate(toInput(name, drafts.lines), { onSuccess: reset });
  return { name, setName, drafts, create, submit };
}

export function MenuItemForm({ ingredients }: { ingredients: Ingredient[] }) {
  const { name, setName, drafts, create, submit } = useMenuItemForm();
  return (
    <FormPanel title="New menu item" error={create.error} onSubmit={submit}>
      <Field label="Name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <h3 className="text-sm font-semibold">Recipe (per portion)</h3>
      <IngredientLines drafts={drafts} ingredients={ingredients} />
      <Button type="submit" className="self-start" disabled={create.isPending}>Add menu item</Button>
    </FormPanel>
  );
}
