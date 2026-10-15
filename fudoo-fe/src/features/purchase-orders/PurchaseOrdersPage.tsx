import { memo } from "react";
import type { PurchaseOrder, PurchaseOrderFilter } from "../../api/types";
import { Button } from "../../components/Button";
import { ListToolbar } from "../../components/ListToolbar";
import { Page } from "../../components/Page";
import { CursorResults } from "../../components/PagedResults";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { TextLink } from "../../components/TextLink";
import { UpdatedAgo } from "../../components/UpdatedAgo";
import { formatDateTime } from "../../lib/format";
import { useCursorParams } from "../../lib/useListParams";
import { useSupplierOptions } from "../suppliers/hooks";
import { PurchaseOrderForm } from "./PurchaseOrderForm";
import { StatusBadge } from "./StatusBadge";
import { usePurchaseOrderPage } from "./hooks";

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

const OrderTable = memo(function OrderTable({ orders }: { orders: PurchaseOrder[] }) {
  return (
    <Table headers={["Order", "Supplier", "Status", "Created", "Lines"]} empty={orders.length === 0}>
      {orders.map((order) => <OrderRow key={order.id} order={order} />)}
    </Table>
  );
});

function OrderList() {
  const list = useCursorParams();
  const filter: PurchaseOrderFilter = list.params.get("status") === "open" ? "open" : "all";
  const orders = usePurchaseOrderPage(filter, list.cursor);
  return (
    <div className="flex flex-col gap-3">
      <ListToolbar>
        <FilterBar value={filter} onChange={(value) => list.setFilter("status", value === "open" ? "open" : null)} />
        {filter === "open" && <UpdatedAgo updatedAt={orders.dataUpdatedAt} />}
      </ListToolbar>
      <CursorResults query={orders} list={list}>{(rows) => <OrderTable orders={rows} />}</CursorResults>
    </div>
  );
}

function NewOrder() {
  const suppliers = useSupplierOptions();
  return <QueryState query={suppliers}>{(data) => <PurchaseOrderForm suppliers={data} />}</QueryState>;
}

export function PurchaseOrdersPage() {
  return (
    <Page title="Purchase orders" description="Order from suppliers and receive deliveries, in full or in part.">
      <NewOrder />
      <OrderList />
    </Page>
  );
}
