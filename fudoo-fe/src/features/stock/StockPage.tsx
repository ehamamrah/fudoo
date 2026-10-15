import type { Ingredient } from "../../api/types";
import { Badge } from "../../components/Badge";
import { Page } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { UpdatedAgo } from "../../components/UpdatedAgo";
import { formatQuantity } from "../../lib/format";
import { useIngredients } from "../ingredients/hooks";

function StockRow({ ingredient }: { ingredient: Ingredient }) {
  const out = Number(ingredient.on_hand) === 0;
  return (
    <Row className={out ? "bg-red-50" : ""} data-testid={`stock-${ingredient.id}`}>
      <Cell>{ingredient.name}</Cell>
      <Cell className="font-mono">{formatQuantity(ingredient.on_hand)} {ingredient.unit}</Cell>
      <Cell><Badge tone={out ? "red" : "green"}>{out ? "Out of stock" : "In stock"}</Badge></Cell>
    </Row>
  );
}

function StockTable({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <Table headers={["Ingredient", "On hand", "Status"]} empty={ingredients.length === 0}>
      {ingredients.map((ingredient) => <StockRow key={ingredient.id} ingredient={ingredient} />)}
    </Table>
  );
}

export function StockPage() {
  const ingredients = useIngredients();
  return (
    <Page title="Stock" aside={<UpdatedAgo updatedAt={ingredients.dataUpdatedAt} />}>
      <QueryState query={ingredients}>{(data) => <StockTable ingredients={data} />}</QueryState>
    </Page>
  );
}
