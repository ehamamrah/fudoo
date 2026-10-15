import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Ingredient, PurchaseOrderInput, Supplier } from "../../api/types";
import { Button } from "../../components/Button";
import { Field, Select } from "../../components/Field";
import { FormPanel } from "../../components/FormPanel";
import { IngredientLines } from "../ingredients/IngredientLines";
import { useLineDrafts, type LineDraft } from "../ingredients/useLineDrafts";
import { useCreatePurchaseOrder } from "./hooks";

interface PurchaseOrderFormProps {
  suppliers: Supplier[];
  ingredients: Ingredient[];
}

function toInput(supplier: string, lines: LineDraft[]): PurchaseOrderInput {
  const orderLines = lines.map((line) => ({ ingredient: Number(line.ingredient), quantity_ordered: line.quantity }));
  return { supplier: Number(supplier), lines: orderLines };
}

function SupplierSelect({ suppliers, value, onChange }: { suppliers: Supplier[]; value: string; onChange: (id: string) => void }) {
  return (
    <Select required value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Choose…</option>
      {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
    </Select>
  );
}

function usePurchaseOrderForm() {
  const [supplier, setSupplier] = useState("");
  const drafts = useLineDrafts();
  const create = useCreatePurchaseOrder();
  const navigate = useNavigate();
  const submit = () =>
    create.mutate(toInput(supplier, drafts.lines), { onSuccess: (order) => navigate(`/purchase-orders/${order.id}`) });
  return { supplier, setSupplier, drafts, create, submit };
}

export function PurchaseOrderForm({ suppliers, ingredients }: PurchaseOrderFormProps) {
  const { supplier, setSupplier, drafts, create, submit } = usePurchaseOrderForm();
  return (
    <FormPanel title="New purchase order (draft)" error={create.error} onSubmit={submit}>
      <Field label="Supplier"><SupplierSelect suppliers={suppliers} value={supplier} onChange={setSupplier} /></Field>
      <IngredientLines drafts={drafts} ingredients={ingredients} />
      <Button type="submit" className="self-start" disabled={create.isPending}>Create purchase order</Button>
    </FormPanel>
  );
}
