import type { Order } from "../../api/types";
import { Page, Panel } from "../../components/Page";
import { CursorResults } from "../../components/PagedResults";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { formatDateTime } from "../../lib/format";
import { useCursorParams } from "../../lib/useListParams";
import { useAddOnOptions } from "../add-ons/hooks";
import { useMenuItemOptions } from "../menu-items/hooks";
import { OrderForm } from "./OrderForm";
import { OrderLines, OrderStatusBadge } from "./OrderOutcome";
import { useOrderPage } from "./hooks";

function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <Table headers={["Ordered at", "Lines", "Status", "External id"]} empty={orders.length === 0}>
      {orders.map((order) => (
        <Row key={order.id}>
          <Cell className="align-top whitespace-nowrap">{formatDateTime(order.ordered_at)}</Cell>
          <Cell><OrderLines lines={order.lines} /></Cell>
          <Cell className="align-top"><OrderStatusBadge status={order.status} /></Cell>
          <Cell className="align-top"><code className="text-xs">{order.external_id}</code></Cell>
        </Row>
      ))}
    </Table>
  );
}

function RecentOrders() {
  const list = useCursorParams();
  const orders = useOrderPage(list.cursor);
  return (
    <Panel title="Recent orders">
      <CursorResults query={orders} list={list}>{(rows) => <OrdersTable orders={rows} />}</CursorResults>
    </Panel>
  );
}

function NewOrder() {
  const menuItems = useMenuItemOptions();
  const addOns = useAddOnOptions();
  return (
    <QueryState query={menuItems}>
      {(items) => <QueryState query={addOns}>{(extras) => <OrderForm options={{ menuItems: items, addOns: extras }} />}</QueryState>}
    </QueryState>
  );
}

export function PosPage() {
  return (
    <Page title="POS simulator" description="Ring up orders the way the point of sale would. The API decides what is fulfilled from stock.">
      <NewOrder />
      <RecentOrders />
    </Page>
  );
}
