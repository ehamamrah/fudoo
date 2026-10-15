import { useState } from "react";
import type { MenuItem, Sale } from "../../api/types";
import { Button } from "../../components/Button";
import { Field, Input, Select } from "../../components/Field";
import { FormPanel } from "../../components/FormPanel";
import { useFormState } from "../../lib/useFormState";
import { useCreateSale } from "./hooks";

const newExternalId = () => crypto.randomUUID();

function useSaleForm() {
  const { values, setField } = useFormState({ menuItem: "", quantity: "1" });
  const [externalId, setExternalId] = useState(newExternalId);
  const create = useCreateSale();
  const input = { external_id: externalId, menu_item: Number(values.menuItem), quantity: Number(values.quantity) };
  const submit = () => create.mutate(input, { onSuccess: () => setExternalId(newExternalId()) });
  return { values, setField, externalId, create, submit };
}

function MenuItemSelect({ items, value, onChange }: { items: MenuItem[]; value: string; onChange: (id: string) => void }) {
  return (
    <Select required value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Choose…</option>
      {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </Select>
  );
}

function SaleResult({ sale }: { sale: Sale }) {
  return (
    <p role="status" className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
      Sale #{sale.id} recorded: {sale.quantity} × {sale.menu_item_name}
    </p>
  );
}

export function SaleForm({ items }: { items: MenuItem[] }) {
  const { values, setField, externalId, create, submit } = useSaleForm();
  return (
    <FormPanel title="Ring up a sale" error={create.error} onSubmit={submit}>
      <Field label="Menu item"><MenuItemSelect items={items} value={values.menuItem} onChange={(id) => setField("menuItem", id)} /></Field>
      <Field label="Quantity"><Input required type="number" min={1} step={1} value={values.quantity} onChange={(e) => setField("quantity", e.target.value)} /></Field>
      <p className="text-xs text-gray-500">External id: <code>{externalId}</code></p>
      <Button type="submit" className="self-start" disabled={create.isPending}>Record sale</Button>
      {create.data && <SaleResult sale={create.data} />}
    </FormPanel>
  );
}
