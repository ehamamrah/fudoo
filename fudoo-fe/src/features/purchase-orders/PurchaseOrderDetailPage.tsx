import { Link, useParams } from "react-router-dom";
import type { PurchaseOrder } from "../../api/types";
import { Page } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { formatDateTime, formatQuantity } from "../../lib/format";
import { ActionButtons } from "./ActionButtons";
import { ReceiveForm } from "./ReceiveForm";
import { StatusBadge } from "./StatusBadge";
import { usePurchaseOrder } from "./hooks";

const withUnit = (quantity: string, unit: string) => `${formatQuantity(quantity)} ${unit}`;

function LinesTable({ order }: { order: PurchaseOrder }) {
  return (
    <Table headers={["Ingredient", "Ordered", "Received", "Outstanding"]}>
      {order.lines.map((line) => (
        <Row key={line.id}>
          <Cell>{line.ingredient_name}</Cell>
          <Cell>{withUnit(line.quantity_ordered, line.unit)}</Cell>
          <Cell>{withUnit(line.quantity_received, line.unit)}</Cell>
          <Cell>{withUnit(line.quantity_outstanding, line.unit)}</Cell>
        </Row>
      ))}
    </Table>
  );
}

function receiveFormKey(order: PurchaseOrder): string {
  return order.lines.map((line) => `${line.id}:${line.quantity_outstanding}`).join("|");
}

function OrderDetail({ order }: { order: PurchaseOrder }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge status={order.status} />
        <span>Supplier: <strong>{order.supplier_name}</strong></span>
        <span>Created: {formatDateTime(order.created_at)}</span>
      </div>
      <ActionButtons order={order} />
      <LinesTable order={order} />
      {order.can_receive && <ReceiveForm key={receiveFormKey(order)} order={order} />}
    </div>
  );
}

export function PurchaseOrderDetailPage() {
  const id = Number(useParams().id);
  const order = usePurchaseOrder(id);
  return (
    <Page title={`Purchase order #${id}`} aside={<Link className="text-blue-700 underline" to="/purchase-orders">Back to list</Link>}>
      <QueryState query={order}>{(data) => <OrderDetail order={data} />}</QueryState>
    </Page>
  );
}
