import type { Ingredient, MenuItem } from "../../api/types";
import { Badge, type Tone } from "../../components/Badge";
import { Page } from "../../components/Page";
import { QueryState } from "../../components/QueryState";
import { Cell, Row, Table } from "../../components/Table";
import { UpdatedAgo } from "../../components/UpdatedAgo";
import { formatQuantity } from "../../lib/format";
import { useIngredients } from "../ingredients/hooks";
import { useMenuItems } from "../menu-items/hooks";
import { menuItemsShortOf, stockLevel, type StockLevel } from "./stockLevel";

const LEVELS: Record<StockLevel, { label: string; tone: Tone; row: string }> = {
  out: { label: "Out of stock", tone: "red", row: "bg-red-50" },
  low: { label: "Low", tone: "amber", row: "bg-amber-50" },
  ok: { label: "OK", tone: "green", row: "" },
};

function StockRow({ ingredient, menuItems }: { ingredient: Ingredient; menuItems: MenuItem[] }) {
  const level = LEVELS[stockLevel(ingredient, menuItems)];
  const shortOf = menuItemsShortOf(ingredient, menuItems);
  return (
    <Row className={level.row} data-testid={`stock-${ingredient.id}`}>
      <Cell>{ingredient.name}</Cell>
      <Cell className="font-mono">{formatQuantity(ingredient.on_hand)} {ingredient.unit}</Cell>
      <Cell><Badge tone={level.tone}>{level.label}</Badge></Cell>
      <Cell>{shortOf.join(", ") || "—"}</Cell>
    </Row>
  );
}

function StockTable({ ingredients, menuItems }: { ingredients: Ingredient[]; menuItems: MenuItem[] }) {
  return (
    <Table headers={["Ingredient", "On hand", "Status", "Not enough for one"]} empty={ingredients.length === 0}>
      {ingredients.map((ingredient) => <StockRow key={ingredient.id} ingredient={ingredient} menuItems={menuItems} />)}
    </Table>
  );
}

export function StockPage() {
  const ingredients = useIngredients();
  const menuItems = useMenuItems();
  return (
    <Page title="Stock" aside={<UpdatedAgo updatedAt={ingredients.dataUpdatedAt} />}>
      <QueryState query={ingredients}>
        {(data) => <StockTable ingredients={data} menuItems={menuItems.data ?? []} />}
      </QueryState>
    </Page>
  );
}
