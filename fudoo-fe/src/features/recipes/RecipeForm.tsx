import { useState } from "react";
import type { IngredientOption, RecipeItemInput } from "../../api/types";
import { Button } from "../../components/Button";
import { Field, Input } from "../../components/Field";
import { FormPanel } from "../../components/FormPanel";
import { IngredientLines } from "../ingredients/IngredientLines";
import { useLineDrafts, type LineDraft } from "../ingredients/useLineDrafts";
import { useCreateRecipe, type RecipeCatalog } from "./catalog";

export interface RecipeFormLabels {
  title: string;
  recipe: string;
  submit: string;
}

interface RecipeFormProps {
  catalog: RecipeCatalog;
  labels: RecipeFormLabels;
  ingredients: IngredientOption[];
}

function toInput(name: string, lines: LineDraft[]): RecipeItemInput {
  return { name, recipe: lines.map((line) => ({ ingredient: Number(line.ingredient), quantity: line.quantity })) };
}

function useRecipeForm(catalog: RecipeCatalog) {
  const [name, setName] = useState("");
  const drafts = useLineDrafts();
  const create = useCreateRecipe(catalog);
  const reset = () => { setName(""); drafts.reset(); };
  const submit = () => create.mutate(toInput(name, drafts.lines), { onSuccess: reset });
  return { name, setName, drafts, create, submit };
}

export function RecipeForm({ catalog, labels, ingredients }: RecipeFormProps) {
  const { name, setName, drafts, create, submit } = useRecipeForm(catalog);
  return (
    <FormPanel title={labels.title} error={create.error} onSubmit={submit}>
      <Field label="Name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <h3 className="text-sm font-semibold">{labels.recipe}</h3>
      <IngredientLines drafts={drafts} ingredients={ingredients} />
      <Button type="submit" className="self-start" disabled={create.isPending}>{labels.submit}</Button>
    </FormPanel>
  );
}
