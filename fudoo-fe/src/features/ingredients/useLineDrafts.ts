import { useRef, useState } from "react";

export interface LineDraft {
  key: number;
  ingredient: string;
  quantity: string;
}

export type LineField = "ingredient" | "quantity";

export function useLineDrafts() {
  const nextKey = useRef(1);
  const blank = (): LineDraft => ({ key: nextKey.current++, ingredient: "", quantity: "" });
  const [lines, setLines] = useState<LineDraft[]>(() => [blank()]);
  const add = () => setLines((current) => [...current, blank()]);
  const remove = (key: number) => setLines((current) => current.filter((line) => line.key !== key));
  const update = (key: number, field: LineField, value: string) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, [field]: value } : line)));
  const reset = () => setLines([blank()]);
  return { lines, add, remove, update, reset };
}
