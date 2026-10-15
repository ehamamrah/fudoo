import type { PurchaseOrderStatus } from "../../api/types";
import { Badge, type Tone } from "../../components/Badge";

const tones: Record<PurchaseOrderStatus, Tone> = {
  draft: "gray",
  sent: "blue",
  received: "amber",
  closed: "green",
  cancelled: "red",
};

export function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge tone={tones[status]}>{status}</Badge>;
}
