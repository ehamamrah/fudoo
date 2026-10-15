import type { Ingredient } from "../../api/types";
import { Badge } from "../../components/Badge";
import { Page } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { StatCard } from "../../components/StatCard";
import { Cell, Row, Table } from "../../components/Table";
import { UpdatedAgo } from "../../components/UpdatedAgo";
import { formatQuantity, isEmptyOrZero } from "../../lib/format";
import { useIngredients } from "../ingredients/hooks";

function StockRow({ ingredient }: { ingredient: Ingredient }) {
  const out = isEmptyOrZero(ingredient.on_hand);
  return (
    <Row className={out ? "bg-red-50/60" : ""} data-testid={`stock-${ingredient.id}`}>
      <Cell className="font-medium text-slate-900">{ingredient.name}</Cell>
      <Cell className="whitespace-nowrap tabular-nums">{formatQuantity(ingredient.on_hand)} {ingredient.unit}</Cell>
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

function StockSummary({ ingredients }: { ingredients: Ingredient[] }) {
  const out = ingredients.filter((ingredient) => isEmptyOrZero(ingredient.on_hand)).length;
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <StatCard label="Ingredients tracked" value={ingredients.length} />
      <StatCard label="In stock" value={ingredients.length - out} tone="success" />
      <StatCard label="Out of stock" value={out} tone={out > 0 ? "danger" : "default"} />
    </div>
  );
}

function StockOverview({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <div className="flex flex-col gap-6">
      <StockSummary ingredients={ingredients} />
      <StockTable ingredients={ingredients} />
    </div>
  );
}

export function StockPage() {
  const ingredients = useIngredients();
  return (
    <Page title="Stock" description="What is in the storeroom right now." aside={<UpdatedAgo updatedAt={ingredients.dataUpdatedAt} />}>
      <QueryState query={ingredients}>{(data) => <StockOverview ingredients={data} />}</QueryState>
    </Page>
  );
}
