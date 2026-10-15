import { useState } from "react";
import type { Supplier } from "../../api/types";
import { Button } from "../../components/Button";
import { Page } from "../../components/Page";
import { PageNumberResults } from "../../components/PagedResults";
import { SearchInput } from "../../components/SearchInput";
import { Cell, Row, Table } from "../../components/Table";
import { noMatchesText } from "../../lib/format";
import { usePageNumberParams } from "../../lib/useListParams";
import { SupplierForm } from "./SupplierForm";
import { SuppliesEditor } from "./SuppliesEditor";
import { useSupplierPage } from "./hooks";

const suppliedNames = (supplier: Supplier) => supplier.supplies.map((item) => item.name).join(", ") || "—";

function SupplierRow({ supplier }: { supplier: Supplier }) {
  const [editing, setEditing] = useState(false);
  return (
    <Row>
      <Cell>{supplier.name}</Cell>
      <Cell>{supplier.contact || "—"}</Cell>
      <Cell>{editing ? <SuppliesEditor supplier={supplier} onDone={() => setEditing(false)} /> : suppliedNames(supplier)}</Cell>
      <Cell>{!editing && <Button variant="secondary" aria-label={`Edit items for ${supplier.name}`} onClick={() => setEditing(true)}>Edit items</Button>}</Cell>
    </Row>
  );
}

function SupplierTable({ suppliers, emptyText }: { suppliers: Supplier[]; emptyText?: string }) {
  return (
    <Table headers={["Name", "Contact", "Supplies", ""]} empty={suppliers.length === 0} emptyText={emptyText}>
      {suppliers.map((supplier) => <SupplierRow key={supplier.id} supplier={supplier} />)}
    </Table>
  );
}

export function SuppliersPage() {
  const list = usePageNumberParams();
  const suppliers = useSupplierPage({ page: list.page, search: list.search });
  return (
    <Page title="Suppliers" description="Who you buy from, and which ingredients each supplier can supply.">
      <SupplierForm />
      <SearchInput label="Search suppliers" value={list.search} onSearch={list.setSearch} />
      <PageNumberResults query={suppliers} list={list}>
        {(rows) => <SupplierTable suppliers={rows} emptyText={noMatchesText(list.search)} />}
      </PageNumberResults>
    </Page>
  );
}
