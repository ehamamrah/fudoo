import { useState } from "react";

export function useFormState<T extends object>(initial: T) {
  const [values, setValues] = useState(initial);
  const setField = <K extends keyof T>(key: K, value: T[K]) => setValues((current) => ({ ...current, [key]: value }));
  const reset = () => setValues(initial);
  return { values, setField, reset };
}
