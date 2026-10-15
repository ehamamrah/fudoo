import type { MenuItem, RecipeLine } from "../../api/types";
import { Page } from "../../components/Page";
import { PageNumberResults } from "../../components/PagedResults";
import { QueryState } from "../../components/QueryState";
import { SearchInput } from "../../components/SearchInput";
import { Cell, Row, Table } from "../../components/Table";
import { formatQuantity, noMatchesText } from "../../lib/format";
import { usePageNumberParams } from "../../lib/useListParams";
import { useIngredientOptions } from "../ingredients/hooks";
import { MenuItemForm } from "./MenuItemForm";
import { useMenuItemPage } from "./hooks";

function Recipe({ recipe }: { recipe: RecipeLine[] }) {
  return (
    <ul>
      {recipe.map((line) => (
        <li key={line.ingredient}>{line.ingredient_name}: {formatQuantity(line.quantity)} {line.unit}</li>
      ))}
    </ul>
  );
}

function MenuItemTable({ items, emptyText }: { items: MenuItem[]; emptyText?: string }) {
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

function NewMenuItem() {
  const ingredients = useIngredientOptions();
  return <QueryState query={ingredients}>{(data) => <MenuItemForm ingredients={data} />}</QueryState>;
}

export function MenuItemsPage() {
  const list = usePageNumberParams();
  const menuItems = useMenuItemPage({ page: list.page, search: list.search });
  return (
    <Page title="Menu items" description="Dishes and the recipe each one uses from stock.">
      <NewMenuItem />
      <SearchInput label="Search menu items" value={list.search} onSearch={list.setSearch} />
      <PageNumberResults query={menuItems} list={list}>
        {(rows) => <MenuItemTable items={rows} emptyText={noMatchesText(list.search)} />}
      </PageNumberResults>
    </Page>
  );
}
