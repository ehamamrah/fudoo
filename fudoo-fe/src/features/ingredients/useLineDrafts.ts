import { useState } from "react";

export interface LineDraft {
  key: number;
  ingredient: string;
  quantity: string;
}

export type LineField = "ingredient" | "quantity";

let lastKey = 0;
const blankLine = (): LineDraft => ({ key: ++lastKey, ingredient: "", quantity: "" });

export function useLineDrafts() {
  const [lines, setLines] = useState<LineDraft[]>(() => [blankLine()]);
  const add = () => setLines((current) => [...current, blankLine()]);
  const remove = (key: number) => setLines((current) => current.filter((line) => line.key !== key));
  const update = (key: number, field: LineField, value: string) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, [field]: value } : line)));
  const reset = () => setLines([blankLine()]);
  return { lines, add, remove, update, reset };
}
