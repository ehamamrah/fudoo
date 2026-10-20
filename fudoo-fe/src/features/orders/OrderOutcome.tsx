import type { FulfilmentStatus, OrderAddOn, OrderLine, OrderStatus, Shortage } from "../../api/types";
import { StatusBadge, type Tone } from "../../components/Badge";
import { ShortageList } from "../../components/ErrorBanner";

const orderTones: Record<OrderStatus, Tone> = { completed: "green", partial: "amber" };
const fulfilmentTones: Record<FulfilmentStatus, Tone> = { fulfilled: "green", skipped: "amber" };

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge status={status} tones={orderTones} />;
}

function Outcome({ status, shortages }: { status: FulfilmentStatus; shortages: Shortage[] }) {
  return (
    <>
      <StatusBadge status={status} tones={fulfilmentTones} />
      {shortages.length > 0 && <div className="w-full text-xs text-amber-800"><ShortageList shortages={shortages} /></div>}
    </>
  );
}

function AddOnOutcome({ addOn }: { addOn: OrderAddOn }) {
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span>+ {addOn.quantity} × {addOn.add_on_name}</span>
      <Outcome status={addOn.status} shortages={addOn.shortages} />
    </li>
  );
}

function LineOutcome({ line }: { line: OrderLine }) {
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span>{line.quantity} × {line.menu_item_name}</span>
      <Outcome status={line.status} shortages={line.shortages} />
      {line.add_ons.length > 0 && (
        <ul className="flex w-full flex-col gap-1 pl-4">{line.add_ons.map((addOn) => <AddOnOutcome key={addOn.id} addOn={addOn} />)}</ul>
      )}
    </li>
  );
}

export function OrderLines({ lines }: { lines: OrderLine[] }) {
  return <ul className="flex flex-col gap-2">{lines.map((line) => <LineOutcome key={line.id} line={line} />)}</ul>;
}
