import { useEffect, useEffectEvent, useState } from "react";
import { Input } from "./Field";

export const SEARCH_DEBOUNCE_MS = 300;

interface SearchInputProps {
  label: string;
  value: string;
  onSearch: (search: string) => void;
}

export function SearchInput({ label, value, onSearch }: SearchInputProps) {
  const [text, setText] = useState(value);
  const emit = useEffectEvent((search: string) => onSearch(search));
  useEffect(() => {
    const search = text.trim();
    if (search === value) return;
    const timer = setTimeout(() => emit(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value]);
  return (
    <div className="w-full sm:max-w-xs">
      <Input type="search" aria-label={label} placeholder={`${label}…`} maxLength={100} value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}
