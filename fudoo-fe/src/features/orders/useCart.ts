import { useState } from "react";
import type { OrderInput } from "../../api/types";

export interface AddOnDraft {
  key: number;
  addOn: string;
  quantity: string;
}

export interface CartLine {
  key: number;
  menuItem: string;
  quantity: string;
  addOns: AddOnDraft[];
}

export type CartLineField = "menuItem" | "quantity";
export type AddOnField = "addOn" | "quantity";

let lastKey = 0;
const blankLine = (): CartLine => ({ key: ++lastKey, menuItem: "", quantity: "1", addOns: [] });
const blankAddOn = (): AddOnDraft => ({ key: ++lastKey, addOn: "", quantity: "1" });

const editAddOns = (line: CartLine, change: (addOns: AddOnDraft[]) => AddOnDraft[]): CartLine =>
  ({ ...line, addOns: change(line.addOns) });

const editAddOn = (addOns: AddOnDraft[], key: number, field: AddOnField, value: string) =>
  addOns.map((draft) => (draft.key === key ? { ...draft, [field]: value } : draft));

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>(() => [blankLine()]);
  const edit = (key: number, change: (line: CartLine) => CartLine) =>
    setLines((current) => current.map((line) => (line.key === key ? change(line) : line)));
  return {
    lines,
    addLine: () => setLines((current) => [...current, blankLine()]),
    removeLine: (key: number) => setLines((current) => current.filter((line) => line.key !== key)),
    updateLine: (key: number, field: CartLineField, value: string) => edit(key, (line) => ({ ...line, [field]: value })),
    addAddOn: (key: number) => edit(key, (line) => editAddOns(line, (addOns) => [...addOns, blankAddOn()])),
    removeAddOn: (key: number, addOnKey: number) => edit(key, (line) => editAddOns(line, (addOns) => addOns.filter((a) => a.key !== addOnKey))),
    updateAddOn: (key: number, addOnKey: number, field: AddOnField, value: string) =>
      edit(key, (line) => editAddOns(line, (addOns) => editAddOn(addOns, addOnKey, field, value))),
    reset: () => setLines([blankLine()]),
  };
}

export type Cart = ReturnType<typeof useCart>;

const toLineInput = (line: CartLine) => ({
  menu_item: Number(line.menuItem),
  quantity: Number(line.quantity),
  add_ons: line.addOns.map((draft) => ({ add_on: Number(draft.addOn), quantity: Number(draft.quantity) })),
});

export const toOrderInput = (externalId: string, lines: CartLine[]): OrderInput =>
  ({ external_id: externalId, lines: lines.map(toLineInput) });
