import type { Supplier } from "../../api/types";
import { Page } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { SupplierForm } from "./SupplierForm";
import { useSuppliers } from "./hooks";

function SupplierTable({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <Table headers={["Name", "Contact"]} empty={suppliers.length === 0}>
      {suppliers.map((supplier) => (
        <Row key={supplier.id}>
          <Cell>{supplier.name}</Cell>
          <Cell>{supplier.contact || "—"}</Cell>
        </Row>
      ))}
    </Table>
  );
}

export function SuppliersPage() {
  const suppliers = useSuppliers();
  return (
    <Page title="Suppliers">
      <SupplierForm />
      <QueryState query={suppliers}>{(data) => <SupplierTable suppliers={data} />}</QueryState>
    </Page>
  );
}
