import type { Sale } from "../../api/types";
import { Page, Panel } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { formatDateTime } from "../../lib/format";
import { useMenuItems } from "../menu-items/hooks";
import { SaleForm } from "./SaleForm";
import { useSales } from "./hooks";

function SalesTable({ sales }: { sales: Sale[] }) {
  return (
    <Table headers={["Sold at", "Menu item", "Quantity", "External id"]} empty={sales.length === 0}>
      {sales.map((sale) => (
        <Row key={sale.id}>
          <Cell>{formatDateTime(sale.sold_at)}</Cell>
          <Cell>{sale.menu_item_name}</Cell>
          <Cell>{sale.quantity}</Cell>
          <Cell><code className="text-xs">{sale.external_id}</code></Cell>
        </Row>
      ))}
    </Table>
  );
}

export function PosPage() {
  const menuItems = useMenuItems();
  const sales = useSales();
  return (
    <Page title="POS simulator" description="Record sales the way the point of sale would. Each sale deducts its recipe from stock.">
      <QueryState query={menuItems}>{(items) => <SaleForm items={items} />}</QueryState>
      <Panel title="Recent sales">
        <QueryState query={sales}>{(data) => <SalesTable sales={data} />}</QueryState>
      </Panel>
    </Page>
  );
}
