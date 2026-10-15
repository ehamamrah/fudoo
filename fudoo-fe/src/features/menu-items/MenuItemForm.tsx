import { useState, type FormEvent } from "react";
import type { Ingredient, MenuItemInput } from "../../api/types";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Field, Input } from "../../components/Field";
import { Panel } from "../../components/Page";
import { IngredientLines } from "../ingredients/IngredientLines";
import { useLineDrafts, type LineDraft } from "../ingredients/useLineDrafts";
import { useCreateMenuItem } from "./hooks";

function toInput(name: string, lines: LineDraft[]): MenuItemInput {
  return { name, recipe: lines.map((line) => ({ ingredient: Number(line.ingredient), quantity: line.quantity })) };
}

export function MenuItemForm({ ingredients }: { ingredients: Ingredient[] }) {
  const [name, setName] = useState("");
  const drafts = useLineDrafts();
  const create = useCreateMenuItem();
  const reset = () => { setName(""); drafts.reset(); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(toInput(name, drafts.lines), { onSuccess: reset });
  };
  return (
    <Panel title="New menu item">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <h3 className="text-sm font-semibold">Recipe (per portion)</h3>
        <IngredientLines drafts={drafts} ingredients={ingredients} />
        <Button type="submit" className="self-start" disabled={create.isPending}>Add menu item</Button>
      </form>
      <ErrorBanner error={create.error} />
    </Panel>
  );
}
