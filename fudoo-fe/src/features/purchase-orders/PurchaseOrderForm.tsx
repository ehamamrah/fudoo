import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import type { Ingredient, PurchaseOrder, PurchaseOrderInput, Supplier } from "../../api/types";
import { Button } from "../../components/Button";
import { Field, Select } from "../../components/Field";
import { FormPanel } from "../../components/FormPanel";
import { TextLink } from "../../components/TextLink";
import { useAttemptId } from "../../lib/useAttemptId";
import { IngredientLines } from "../ingredients/IngredientLines";
import { useLineDrafts, type LineDraft } from "../ingredients/useLineDrafts";
import { useCreatePurchaseOrder } from "./hooks";

interface PurchaseOrderFormProps {
  suppliers: Supplier[];
  ingredients: Ingredient[];
}

interface LineSectionProps {
  supplier: Supplier | undefined;
  offered: Ingredient[];
  drafts: ReturnType<typeof useLineDrafts>;
}

function toInput(requestId: string, supplier: string, lines: LineDraft[]): PurchaseOrderInput {
  const orderLines = lines.map((line) => ({ ingredient: Number(line.ingredient), quantity_ordered: line.quantity }));
  return { request_id: requestId, supplier: Number(supplier), lines: orderLines };
}

function offeredBy(supplier: Supplier | undefined, ingredients: Ingredient[]): Ingredient[] {
  if (!supplier) return [];
  return ingredients.filter((ingredient) => supplier.ingredients.includes(ingredient.id));
}

function SupplierSelect({ suppliers, value, onChange }: { suppliers: Supplier[]; value: string; onChange: (id: string) => void }) {
  return (
    <Select required value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Choose…</option>
      {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
    </Select>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function LineSection({ supplier, offered, drafts }: LineSectionProps) {
  if (!supplier) return <Hint>Choose a supplier first.</Hint>;
  if (offered.length > 0) return <IngredientLines drafts={drafts} ingredients={offered} />;
  return (
    <Hint>
      {supplier.name} supplies no ingredients yet.{" "}
      <TextLink to="/suppliers">Set them on the Suppliers page</TextLink>.
    </Hint>
  );
}

function usePurchaseOrderForm({ suppliers, ingredients }: PurchaseOrderFormProps) {
  const [supplierId, setSupplierId] = useState("");
  const drafts = useLineDrafts();
  const attempt = useAttemptId();
  const create = useCreatePurchaseOrder();
  const navigate = useNavigate();
  const supplier = suppliers.find((candidate) => String(candidate.id) === supplierId);
  const chooseSupplier = (id: string) => { setSupplierId(id); drafts.reset(); };
  const open = (order: PurchaseOrder) => { attempt.renew(); void navigate(`/purchase-orders/${order.id}`); };
  const submit = () => create.mutate(toInput(attempt.id, supplierId, drafts.lines), { onSuccess: open });
  return { supplierId, chooseSupplier, supplier, offered: offeredBy(supplier, ingredients), drafts, create, submit };
}

export function PurchaseOrderForm(props: PurchaseOrderFormProps) {
  const { supplierId, chooseSupplier, supplier, offered, drafts, create, submit } = usePurchaseOrderForm(props);
  return (
    <FormPanel title="New purchase order (draft)" error={create.error} onSubmit={submit}>
      <Field label="Supplier"><SupplierSelect suppliers={props.suppliers} value={supplierId} onChange={chooseSupplier} /></Field>
      <LineSection supplier={supplier} offered={offered} drafts={drafts} />
      <Button type="submit" className="self-start" disabled={create.isPending || offered.length === 0}>Create purchase order</Button>
    </FormPanel>
  );
}
