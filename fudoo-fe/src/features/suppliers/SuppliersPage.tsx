import { useState } from "react";
import type { Ingredient, Supplier } from "../../api/types";
import { Button } from "../../components/Button";
import { Page } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { useIngredients } from "../ingredients/hooks";
import { SupplierForm } from "./SupplierForm";
import { SuppliesEditor } from "./SuppliesEditor";
import { useSuppliers } from "./hooks";

function suppliedNames(supplier: Supplier, ingredients: Ingredient[]): string {
  const names = ingredients.filter((ingredient) => supplier.ingredients.includes(ingredient.id)).map((i) => i.name);
  return names.length > 0 ? names.join(", ") : "—";
}

function SupplierRow({ supplier, ingredients }: { supplier: Supplier; ingredients: Ingredient[] }) {
  const [editing, setEditing] = useState(false);
  return (
    <Row>
      <Cell>{supplier.name}</Cell>
      <Cell>{supplier.contact || "—"}</Cell>
      <Cell>
        {editing
          ? <SuppliesEditor supplier={supplier} ingredients={ingredients} onDone={() => setEditing(false)} />
          : suppliedNames(supplier, ingredients)}
      </Cell>
      <Cell>{!editing && <Button variant="secondary" aria-label={`Edit items for ${supplier.name}`} onClick={() => setEditing(true)}>Edit items</Button>}</Cell>
    </Row>
  );
}

function SupplierTable({ suppliers, ingredients }: { suppliers: Supplier[]; ingredients: Ingredient[] }) {
  return (
    <Table headers={["Name", "Contact", "Supplies", ""]} empty={suppliers.length === 0}>
      {suppliers.map((supplier) => <SupplierRow key={supplier.id} supplier={supplier} ingredients={ingredients} />)}
    </Table>
  );
}

export function SuppliersPage() {
  const suppliers = useSuppliers();
  const ingredients = useIngredients();
  return (
    <Page title="Suppliers">
      <QueryState query={ingredients}>
        {(ingredientList) => (
          <>
            <SupplierForm ingredients={ingredientList} />
            <QueryState query={suppliers}>{(data) => <SupplierTable suppliers={data} ingredients={ingredientList} />}</QueryState>
          </>
        )}
      </QueryState>
    </Page>
  );
}
