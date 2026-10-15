import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import type { PurchaseOrder } from "../../api/types";
import { Icon } from "../../components/Icon";
import { Page } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { TextLink } from "../../components/TextLink";
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

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function OrderSummary({ order }: { order: PurchaseOrder }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <dl className="grid gap-4 sm:grid-cols-3">
        <Meta label="Status"><StatusBadge status={order.status} /></Meta>
        <Meta label="Supplier">{order.supplier_name}</Meta>
        <Meta label="Created">{formatDateTime(order.created_at)}</Meta>
      </dl>
      <ActionButtons order={order} />
    </div>
  );
}

function OrderDetail({ order }: { order: PurchaseOrder }) {
  return (
    <div className="flex flex-col gap-6">
      <OrderSummary order={order} />
      <LinesTable order={order} />
      {order.can_receive && <ReceiveForm key={receiveFormKey(order)} order={order} />}
    </div>
  );
}

export function PurchaseOrderDetailPage() {
  const id = Number(useParams().id);
  const order = usePurchaseOrder(id);
  return (
    <Page title={`Purchase order #${id}`} aside={<TextLink className="inline-flex items-center gap-1.5 text-sm" to="/purchase-orders"><Icon name="back" className="h-4 w-4" />Back to list</TextLink>}>
      <QueryState query={order}>{(data) => <OrderDetail order={data} />}</QueryState>
    </Page>
  );
}
