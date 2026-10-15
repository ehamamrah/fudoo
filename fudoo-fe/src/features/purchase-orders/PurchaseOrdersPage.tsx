import { useState } from "react";
import type { PurchaseOrder, PurchaseOrderFilter } from "../../api/types";
import { Button } from "../../components/Button";
import { Page } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { TextLink } from "../../components/TextLink";
import { UpdatedAgo } from "../../components/UpdatedAgo";
import { formatDateTime } from "../../lib/format";
import { useIngredients } from "../ingredients/hooks";
import { useSuppliers } from "../suppliers/hooks";
import { PurchaseOrderForm } from "./PurchaseOrderForm";
import { StatusBadge } from "./StatusBadge";
import { usePurchaseOrders } from "./hooks";

const FILTERS: { value: PurchaseOrderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open (sent / received)" },
];

function FilterBar({ value, onChange }: { value: PurchaseOrderFilter; onChange: (filter: PurchaseOrderFilter) => void }) {
  return (
    <div className="flex gap-2" role="group" aria-label="Status filter">
      {FILTERS.map((filter) => (
        <Button key={filter.value} variant={filter.value === value ? "primary" : "secondary"}
          aria-pressed={filter.value === value} onClick={() => onChange(filter.value)}>{filter.label}</Button>
      ))}
    </div>
  );
}

function OrderRow({ order }: { order: PurchaseOrder }) {
  return (
    <Row>
      <Cell><TextLink to={`/purchase-orders/${order.id}`}>PO #{order.id}</TextLink></Cell>
      <Cell>{order.supplier_name}</Cell>
      <Cell><StatusBadge status={order.status} /></Cell>
      <Cell>{formatDateTime(order.created_at)}</Cell>
      <Cell>{order.lines.length}</Cell>
    </Row>
  );
}

function OrderTable({ orders }: { orders: PurchaseOrder[] }) {
  return (
    <Table headers={["Order", "Supplier", "Status", "Created", "Lines"]} empty={orders.length === 0}>
      {orders.map((order) => <OrderRow key={order.id} order={order} />)}
    </Table>
  );
}

function OrderList() {
  const [filter, setFilter] = useState<PurchaseOrderFilter>("all");
  const orders = usePurchaseOrders(filter);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterBar value={filter} onChange={setFilter} />
        {filter === "open" && <UpdatedAgo updatedAt={orders.dataUpdatedAt} />}
      </div>
      <QueryState query={orders}>{(data) => <OrderTable orders={data} />}</QueryState>
    </div>
  );
}

function NewOrder() {
  const suppliers = useSuppliers();
  const ingredients = useIngredients();
  return (
    <QueryState query={suppliers}>
      {(supplierList) => (
        <QueryState query={ingredients}>
          {(ingredientList) => <PurchaseOrderForm suppliers={supplierList} ingredients={ingredientList} />}
        </QueryState>
      )}
    </QueryState>
  );
}

export function PurchaseOrdersPage() {
  return (
    <Page title="Purchase orders" description="Order from suppliers and receive deliveries, in full or in part.">
      <NewOrder />
      <OrderList />
    </Page>
  );
}
