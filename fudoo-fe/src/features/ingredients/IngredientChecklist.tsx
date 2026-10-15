import type { Ingredient } from "../../api/types";

interface IngredientChecklistProps {
  label: string;
  ingredients: Ingredient[];
  selected: number[];
  onChange: (selected: number[]) => void;
}

const toggled = (selected: number[], id: number) =>
  selected.includes(id) ? selected.filter((current) => current !== id) : [...selected, id];

export function IngredientChecklist({ label, ingredients, selected, onChange }: IngredientChecklistProps) {
  return (
    <fieldset className="flex flex-col gap-1 text-sm">
      <legend className="mb-1 font-medium text-gray-700">{label}</legend>
      {ingredients.length === 0 && <p className="text-gray-500">No ingredients yet.</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {ingredients.map((ingredient) => (
          <label key={ingredient.id} className="flex items-center gap-1">
            <input type="checkbox" checked={selected.includes(ingredient.id)}
              onChange={() => onChange(toggled(selected, ingredient.id))} />
            {ingredient.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
