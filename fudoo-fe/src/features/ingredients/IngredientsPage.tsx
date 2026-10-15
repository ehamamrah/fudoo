import type { Ingredient } from "../../api/types";
import { Page } from "../../components/Page";
import { PageNumberResults } from "../../components/PagedResults";
import { SearchInput } from "../../components/SearchInput";
import { Cell, Row, Table } from "../../components/Table";
import { formatQuantity, noMatchesText } from "../../lib/format";
import { usePageNumberParams } from "../../lib/useListParams";
import { IngredientForm } from "./IngredientForm";
import { useIngredientPage } from "./hooks";

function IngredientTable({ ingredients, emptyText }: { ingredients: Ingredient[]; emptyText?: string }) {
  return (
    <Table headers={["Name", "Unit", "On hand"]} empty={ingredients.length === 0} emptyText={emptyText}>
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
  const list = usePageNumberParams();
  const ingredients = useIngredientPage({ page: list.page, search: list.search, outOfStock: false });
  return (
    <Page title="Ingredients" description="Everything the kitchen keeps in stock, in a single unit each.">
      <IngredientForm />
      <SearchInput label="Search ingredients" value={list.search} onSearch={list.setSearch} />
      <PageNumberResults query={ingredients} list={list}>
        {(rows) => <IngredientTable ingredients={rows} emptyText={noMatchesText(list.search)} />}
      </PageNumberResults>
    </Page>
  );
}
