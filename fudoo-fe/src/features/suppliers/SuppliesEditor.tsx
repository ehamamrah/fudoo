import { useState } from "react";
import type { Ingredient, Supplier } from "../../api/types";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/ErrorBanner";
import { IngredientChecklist } from "../ingredients/IngredientChecklist";
import { useUpdateSupplierIngredients } from "./hooks";

interface SuppliesEditorProps {
  supplier: Supplier;
  ingredients: Ingredient[];
  onDone: () => void;
}

export function SuppliesEditor({ supplier, ingredients, onDone }: SuppliesEditorProps) {
  const [selected, setSelected] = useState(supplier.ingredients);
  const update = useUpdateSupplierIngredients(supplier.id);
  return (
    <div className="flex flex-col gap-2">
      <IngredientChecklist label={`Supplies for ${supplier.name}`} ingredients={ingredients} selected={selected} onChange={setSelected} />
      <div className="flex gap-2">
        <Button disabled={update.isPending} onClick={() => update.mutate(selected, { onSuccess: onDone })}>Save</Button>
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
      <ErrorBanner error={update.error} />
    </div>
  );
}
