import type { Option } from "../../api/types";
import { Button } from "../../components/Button";
import { Field, Input, Select } from "../../components/Field";
import type { AddOnDraft, AddOnField, Cart, CartLine } from "./useCart";

export interface CartOptions {
  menuItems: Option[];
  addOns: Option[];
}

interface ControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function OptionSelect({ label, value, onChange, options }: ControlProps & { options: Option[] }) {
  return (
    <Field label={label}>
      <Select required value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose…</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </Select>
    </Field>
  );
}

function CountInput({ label, value, onChange }: ControlProps) {
  return (
    <Field label={label}>
      <Input required type="number" min={1} step={1} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

interface AddOnRowProps {
  draft: AddOnDraft;
  label: string;
  addOns: Option[];
  onChange: (field: AddOnField, value: string) => void;
  onRemove: () => void;
}

function AddOnRow({ draft, label, addOns, onChange, onRemove }: AddOnRowProps) {
  return (
    <div className="grid grid-cols-[1fr_6rem_auto] items-end gap-2 pl-4">
      <OptionSelect label={`Add-on ${label}`} options={addOns} value={draft.addOn} onChange={(value) => onChange("addOn", value)} />
      <CountInput label={`Add-on ${label} quantity`} value={draft.quantity} onChange={(value) => onChange("quantity", value)} />
      <Button variant="secondary" onClick={onRemove} aria-label={`Remove add-on ${label}`}>✕</Button>
    </div>
  );
}

interface LineProps {
  line: CartLine;
  position: number;
  cart: Cart;
  options: CartOptions;
}

function LineAddOns({ line, position, cart, options }: LineProps) {
  return (
    <div className="flex flex-col gap-2">
      {line.addOns.map((draft, index) => (
        <AddOnRow key={draft.key} draft={draft} label={`${position}.${index + 1}`} addOns={options.addOns}
          onChange={(field, value) => cart.updateAddOn(line.key, draft.key, field, value)}
          onRemove={() => cart.removeAddOn(line.key, draft.key)} />
      ))}
      <Button variant="secondary" className="self-start pl-4" onClick={() => cart.addAddOn(line.key)}
        aria-label={`Add add-on to line ${position}`}>Add add-on</Button>
    </div>
  );
}

function CartLineEditor({ line, position, cart, options, removable }: LineProps & { removable: boolean }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-slate-200">
      <legend className="px-1 text-sm font-semibold text-slate-700">Line {position}</legend>
      <div className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
        <OptionSelect label={`Menu item ${position}`} options={options.menuItems} value={line.menuItem}
          onChange={(value) => cart.updateLine(line.key, "menuItem", value)} />
        <CountInput label={`Quantity ${position}`} value={line.quantity} onChange={(value) => cart.updateLine(line.key, "quantity", value)} />
        <Button variant="secondary" disabled={!removable} onClick={() => cart.removeLine(line.key)} aria-label={`Remove line ${position}`}>✕</Button>
      </div>
      <LineAddOns line={line} position={position} cart={cart} options={options} />
    </fieldset>
  );
}

export function CartEditor({ cart, options }: { cart: Cart; options: CartOptions }) {
  const removable = cart.lines.length > 1;
  return (
    <div className="flex flex-col gap-3">
      {cart.lines.map((line, index) => (
        <CartLineEditor key={line.key} line={line} position={index + 1} cart={cart} options={options} removable={removable} />
      ))}
      <Button variant="secondary" className="self-start" onClick={cart.addLine}>Add line</Button>
    </div>
  );
}
