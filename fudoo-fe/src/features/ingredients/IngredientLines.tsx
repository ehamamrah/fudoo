import type { IngredientOption } from "../../api/types";
import { Button } from "../../components/Button";
import { Field, Input, Select } from "../../components/Field";
import type { LineDraft, LineField, useLineDrafts } from "./useLineDrafts";

interface IngredientLinesProps {
  drafts: ReturnType<typeof useLineDrafts>;
  ingredients: IngredientOption[];
}

interface LineProps {
  line: LineDraft;
  position: number;
  ingredients: IngredientOption[];
  onChange: (field: LineField, value: string) => void;
  onRemove?: () => void;
}

function IngredientLine({ line, position, ingredients, onChange, onRemove }: LineProps) {
  return (
    <div className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
      <Field label={`Ingredient ${position}`}>
        <Select required value={line.ingredient} onChange={(e) => onChange("ingredient", e.target.value)}>
          <option value="">Choose…</option>
          {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
        </Select>
      </Field>
      <Field label={`Quantity ${position}`}>
        <Input required type="number" step="0.001" value={line.quantity} onChange={(e) => onChange("quantity", e.target.value)} />
      </Field>
      <Button variant="secondary" onClick={onRemove} disabled={!onRemove} aria-label={`Remove line ${position}`}>✕</Button>
    </div>
  );
}

export function IngredientLines({ drafts, ingredients }: IngredientLinesProps) {
  const removable = drafts.lines.length > 1;
  return (
    <div className="flex flex-col gap-2">
      {drafts.lines.map((line, index) => (
        <IngredientLine key={line.key} line={line} position={index + 1} ingredients={ingredients}
          onChange={(field, value) => drafts.update(line.key, field, value)}
          onRemove={removable ? () => drafts.remove(line.key) : undefined} />
      ))}
      <Button variant="secondary" className="self-start" onClick={drafts.add}>Add line</Button>
    </div>
  );
}
