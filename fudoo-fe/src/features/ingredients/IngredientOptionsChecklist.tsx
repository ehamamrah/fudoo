import { QueryState } from "../../components/QueryState";
import { IngredientChecklist } from "./IngredientChecklist";
import { useIngredientOptions } from "./hooks";

interface IngredientOptionsChecklistProps {
  label: string;
  selected: number[];
  onChange: (selected: number[]) => void;
}

export function IngredientOptionsChecklist(props: IngredientOptionsChecklistProps) {
  const options = useIngredientOptions();
  return <QueryState query={options}>{(ingredients) => <IngredientChecklist {...props} ingredients={ingredients} />}</QueryState>;
}
