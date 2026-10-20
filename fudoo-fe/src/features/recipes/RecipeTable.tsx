import type { RecipeItem, RecipeLine } from "../../api/types";
import { Cell, Row, Table } from "../../components/Table";
import { formatQuantity } from "../../lib/format";

function Recipe({ recipe }: { recipe: RecipeLine[] }) {
  return (
    <ul>
      {recipe.map((line) => (
        <li key={line.ingredient}>{line.ingredient_name}: {formatQuantity(line.quantity)} {line.unit}</li>
      ))}
    </ul>
  );
}

export function RecipeTable({ items, emptyText }: { items: RecipeItem[]; emptyText?: string }) {
  return (
    <Table headers={["Name", "Recipe"]} empty={items.length === 0} emptyText={emptyText}>
      {items.map((item) => (
        <Row key={item.id}>
          <Cell>{item.name}</Cell>
          <Cell><Recipe recipe={item.recipe} /></Cell>
        </Row>
      ))}
    </Table>
  );
}
