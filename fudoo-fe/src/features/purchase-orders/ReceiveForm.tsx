import { useState } from "react";
import type { DeliveryInput, PurchaseOrder, PurchaseOrderLine } from "../../api/types";
import { Button } from "../../components/Button";
import { Input } from "../../components/Field";
import { FormPanel } from "../../components/FormPanel";
import { formatQuantity, isEmptyOrZero } from "../../lib/format";
import { useAttemptId } from "../../lib/useAttemptId";
import { useReceiveDelivery } from "./hooks";

type Quantities = Record<number, string>;

function outstandingByLine(lines: PurchaseOrderLine[]): Quantities {
  return Object.fromEntries(lines.map((line) => [line.id, formatQuantity(line.quantity_outstanding)]));
}

function toDelivery(requestId: string, quantities: Quantities): DeliveryInput {
  const entries = Object.entries(quantities).filter(([, quantity]) => !isEmptyOrZero(quantity));
  return { request_id: requestId, lines: entries.map(([line, quantity]) => ({ line: Number(line), quantity: quantity.trim() })) };
}

interface ReceiveLineProps {
  line: PurchaseOrderLine;
  value: string;
  onChange: (value: string) => void;
}

function ReceiveLine({ line, value, onChange }: ReceiveLineProps) {
  return (
    <label className="grid grid-cols-[1fr_10rem_3rem] items-center gap-2 text-sm">
      <span>{line.ingredient_name} (outstanding {formatQuantity(line.quantity_outstanding)} {line.unit})</span>
      <Input type="number" step="0.001" value={value} onChange={(event) => onChange(event.target.value)}
        aria-label={`Receive ${line.ingredient_name}`} />
      <span>{line.unit}</span>
    </label>
  );
}

function useReceiveForm(order: PurchaseOrder) {
  const [quantities, setQuantities] = useState(() => outstandingByLine(order.lines));
  const attempt = useAttemptId();
  const receive = useReceiveDelivery(order.id);
  const delivery = toDelivery(attempt.id, quantities);
  const setLine = (id: number, value: string) => setQuantities((current) => ({ ...current, [id]: value }));
  const submit = () => delivery.lines.length > 0 && receive.mutate(delivery, { onSuccess: attempt.renew });
  return { quantities, setLine, submit, receive, isEmpty: delivery.lines.length === 0 };
}

export function ReceiveForm({ order }: { order: PurchaseOrder }) {
  const { quantities, setLine, submit, receive, isEmpty } = useReceiveForm(order);
  return (
    <FormPanel title="Receive delivery" error={receive.error} onSubmit={submit}>
      {order.lines.map((line) => (
        <ReceiveLine key={line.id} line={line} value={quantities[line.id] ?? ""} onChange={(value) => setLine(line.id, value)} />
      ))}
      <Button type="submit" className="self-start" disabled={receive.isPending || isEmpty}>Record delivery</Button>
    </FormPanel>
  );
}
