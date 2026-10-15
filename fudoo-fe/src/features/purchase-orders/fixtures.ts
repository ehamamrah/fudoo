import type { PurchaseOrder } from "../../api/types";

export function purchaseOrder(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: 7,
    supplier: 1,
    supplier_name: "Meat Co",
    status: "received",
    created_at: "2026-10-15T10:00:00Z",
    lines: [
      { id: 11, ingredient: 1, ingredient_name: "Beef", unit: "g", quantity_ordered: "5000.000", quantity_received: "3000.000", quantity_outstanding: "2000.000" },
      { id: 12, ingredient: 2, ingredient_name: "Bun", unit: "pcs", quantity_ordered: "100.000", quantity_received: "40.000", quantity_outstanding: "60.000" },
    ],
    allowed_actions: ["close"],
    can_receive: true,
    ...overrides,
  };
}
