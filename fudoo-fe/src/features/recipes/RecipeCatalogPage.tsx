import { Page } from "../../components/Page";
import { PageNumberResults } from "../../components/PagedResults";
import { QueryState } from "../../components/QueryState";
import { SearchInput } from "../../components/SearchInput";
import { noMatchesText } from "../../lib/format";
import { usePageNumberParams } from "../../lib/useListParams";
import { useIngredientOptions } from "../ingredients/hooks";
import { useRecipePage, type RecipeCatalog } from "./catalog";
import { RecipeForm, type RecipeFormLabels } from "./RecipeForm";
import { RecipeTable } from "./RecipeTable";

export interface RecipeCatalogLabels {
  title: string;
  description: string;
  search: string;
  form: RecipeFormLabels;
}

interface RecipeCatalogPageProps {
  catalog: RecipeCatalog;
  labels: RecipeCatalogLabels;
}

function NewRecipeItem({ catalog, labels }: { catalog: RecipeCatalog; labels: RecipeFormLabels }) {
  const ingredients = useIngredientOptions();
  return <QueryState query={ingredients}>{(data) => <RecipeForm catalog={catalog} labels={labels} ingredients={data} />}</QueryState>;
}

export function RecipeCatalogPage({ catalog, labels }: RecipeCatalogPageProps) {
  const list = usePageNumberParams();
  const items = useRecipePage(catalog, { page: list.page, search: list.search });
  return (
    <Page title={labels.title} description={labels.description}>
      <NewRecipeItem catalog={catalog} labels={labels.form} />
      <SearchInput label={labels.search} value={list.search} onSearch={list.setSearch} />
      <PageNumberResults query={items} list={list}>
        {(rows) => <RecipeTable items={rows} emptyText={noMatchesText(list.search)} />}
      </PageNumberResults>
    </Page>
  );
}
