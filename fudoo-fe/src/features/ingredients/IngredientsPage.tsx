import type { Ingredient } from "../../api/types";
import { Page } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { formatQuantity } from "../../lib/format";
import { IngredientForm } from "./IngredientForm";
import { useIngredients } from "./hooks";

function IngredientTable({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <Table headers={["Name", "Unit", "On hand"]} empty={ingredients.length === 0}>
      {ingredients.map((ingredient) => (
        <Row key={ingredient.id}>
          <Cell>{ingredient.name}</Cell>
          <Cell>{ingredient.unit}</Cell>
          <Cell>{formatQuantity(ingredient.on_hand)} {ingredient.unit}</Cell>
        </Row>
      ))}
    </Table>
  );
}

export function IngredientsPage() {
  const ingredients = useIngredients();
  return (
    <Page title="Ingredients" description="Everything the kitchen keeps in stock, in a single unit each.">
      <IngredientForm />
      <QueryState query={ingredients}>{(data) => <IngredientTable ingredients={data} />}</QueryState>
    </Page>
  );
}
