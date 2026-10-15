import type { MenuItem, RecipeLine } from "../../api/types";
import { Page } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { formatQuantity } from "../../lib/format";
import { useIngredients } from "../ingredients/hooks";
import { MenuItemForm } from "./MenuItemForm";
import { useMenuItems } from "./hooks";

function Recipe({ recipe }: { recipe: RecipeLine[] }) {
  return (
    <ul>
      {recipe.map((line) => (
        <li key={line.ingredient}>{line.ingredient_name}: {formatQuantity(line.quantity)} {line.unit}</li>
      ))}
    </ul>
  );
}

function MenuItemTable({ items }: { items: MenuItem[] }) {
  return (
    <Table headers={["Name", "Recipe"]} empty={items.length === 0}>
      {items.map((item) => (
        <Row key={item.id}>
          <Cell>{item.name}</Cell>
          <Cell><Recipe recipe={item.recipe} /></Cell>
        </Row>
      ))}
    </Table>
  );
}

export function MenuItemsPage() {
  const menuItems = useMenuItems();
  const ingredients = useIngredients();
  return (
    <Page title="Menu items">
      <QueryState query={ingredients}>{(data) => <MenuItemForm ingredients={data} />}</QueryState>
      <QueryState query={menuItems}>{(data) => <MenuItemTable items={data} />}</QueryState>
    </Page>
  );
}
