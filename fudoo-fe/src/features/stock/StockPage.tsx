import { memo } from "react";
import type { Ingredient, IngredientSummary } from "../../api/types";
import { Badge } from "../../components/Badge";
import { ListToolbar } from "../../components/ListToolbar";
import { Page } from "../../components/Page";
import { PageNumberResults } from "../../components/PagedResults";
import { QueryState } from "../../components/QueryState";
import { SearchInput } from "../../components/SearchInput";
import { StatCard } from "../../components/StatCard";
import { Cell, Row, Table } from "../../components/Table";
import { UpdatedAgo } from "../../components/UpdatedAgo";
import { formatQuantity, noMatchesText } from "../../lib/format";
import { usePageNumberParams } from "../../lib/useListParams";
import { useStockPage, useStockSummary } from "./hooks";

function StockRow({ ingredient }: { ingredient: Ingredient }) {
  const out = ingredient.out_of_stock;
  return (
    <Row className={out ? "bg-red-50/60" : ""} data-testid={`stock-${ingredient.id}`}>
      <Cell className="font-medium text-slate-900">{ingredient.name}</Cell>
      <Cell className="whitespace-nowrap tabular-nums">{formatQuantity(ingredient.on_hand)} {ingredient.unit}</Cell>
      <Cell><Badge tone={out ? "red" : "green"}>{out ? "Out of stock" : "In stock"}</Badge></Cell>
    </Row>
  );
}

const StockTable = memo(function StockTable({ ingredients, emptyText }: { ingredients: Ingredient[]; emptyText?: string }) {
  return (
    <Table headers={["Ingredient", "On hand", "Status"]} empty={ingredients.length === 0} emptyText={emptyText}>
      {ingredients.map((ingredient) => <StockRow key={ingredient.id} ingredient={ingredient} />)}
    </Table>
  );
});

function StockSummary({ summary }: { summary: IngredientSummary }) {
  const out = summary.out_of_stock;
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <StatCard label="Ingredients tracked" value={summary.total} />
      <StatCard label="In stock" value={summary.in_stock} tone="success" />
      <StatCard label="Out of stock" value={out} tone={out > 0 ? "danger" : "default"} />
    </div>
  );
}

function OutOfStockToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input type="checkbox" className="h-4 w-4 rounded-sm border-slate-300 accent-brand-600" checked={checked}
        onChange={(event) => onChange(event.target.checked)} />
      Out of stock only
    </label>
  );
}

const emptyText = (search: string, outOfStock: boolean) =>
  noMatchesText(search) ?? (outOfStock ? "Nothing is out of stock." : undefined);

function StockList() {
  const list = usePageNumberParams();
  const outOfStock = list.params.get("stock") === "out";
  const stock = useStockPage({ page: list.page, search: list.search, outOfStock });
  return (
    <>
      <ListToolbar>
        <SearchInput label="Search stock" value={list.search} onSearch={list.setSearch} />
        <OutOfStockToggle checked={outOfStock} onChange={(checked) => list.setFilter("stock", checked ? "out" : null)} />
      </ListToolbar>
      <PageNumberResults query={stock} list={list}>
        {(rows) => <StockTable ingredients={rows} emptyText={emptyText(list.search, outOfStock)} />}
      </PageNumberResults>
    </>
  );
}

export function StockPage() {
  const summary = useStockSummary();
  return (
    <Page title="Stock" description="What is in the storeroom right now." aside={<UpdatedAgo updatedAt={summary.dataUpdatedAt} />}>
      <QueryState query={summary}>{(data) => <StockSummary summary={data} />}</QueryState>
      <StockList />
    </Page>
  );
}
