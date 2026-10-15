import type { PurchaseOrder, PurchaseOrderAction } from "../../api/types";
import { Button } from "../../components/Button";
import { ErrorBanner } from "../../components/ErrorBanner";
import { usePurchaseOrderAction } from "./hooks";

const LABELS: Record<PurchaseOrderAction, string> = {
  send: "Send to supplier",
  cancel: "Cancel order",
  close: "Close (short-close)",
};

const VARIANTS: Record<PurchaseOrderAction, "primary" | "secondary" | "danger"> = {
  send: "primary",
  cancel: "danger",
  close: "secondary",
};

export function ActionButtons({ order }: { order: PurchaseOrder }) {
  const action = usePurchaseOrderAction(order.id);
  if (order.allowed_actions.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {order.allowed_actions.map((name) => (
          <Button key={name} variant={VARIANTS[name]} disabled={action.isPending} onClick={() => action.mutate(name)}>
            {LABELS[name] ?? name}
          </Button>
        ))}
      </div>
      <ErrorBanner error={action.error} />
    </div>
  );
}
