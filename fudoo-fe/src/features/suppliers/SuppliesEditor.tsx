import { useState } from "react";
import type { Supplier } from "../../api/types";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/ErrorBanner";
import { IngredientOptionsChecklist } from "../ingredients/IngredientOptionsChecklist";
import { useUpdateSupplierIngredients } from "./hooks";

export function SuppliesEditor({ supplier, onDone }: { supplier: Supplier; onDone: () => void }) {
  const [selected, setSelected] = useState(supplier.ingredients);
  const update = useUpdateSupplierIngredients(supplier.id);
  return (
    <div className="flex flex-col gap-2">
      <IngredientOptionsChecklist label={`Supplies for ${supplier.name}`} selected={selected} onChange={setSelected} />
      <div className="flex gap-2">
        <Button disabled={update.isPending} onClick={() => update.mutate(selected, { onSuccess: onDone })}>Save</Button>
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
      <ErrorBanner error={update.error} />
    </div>
  );
}
