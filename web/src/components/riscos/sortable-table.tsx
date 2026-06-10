"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { TableHead } from "@/components/ui/table";

export type SortDir = "asc" | "desc" | null;

export interface SortState<K extends string> {
  key: K | null;
  dir: SortDir;
}

export function useSort<K extends string>(initial: SortState<K> = { key: null, dir: null }) {
  const [state, setState] = useState<SortState<K>>(initial);
  const toggle = (key: K) =>
    setState((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  return { state, toggle };
}

export function sortRows<T, K extends string>(
  rows: T[],
  state: SortState<K>,
  getters: Partial<Record<K, (row: T) => string | number | null | undefined>>,
): T[] {
  if (!state.key || !state.dir) return rows;
  const getter = getters[state.key];
  if (!getter) return rows;
  const mult = state.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = getter(a);
    const vb = getter(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * mult;
    return String(va).localeCompare(String(vb), "pt-BR", { numeric: true }) * mult;
  });
}

export function SortableTh<K extends string>({
  label,
  sortKey,
  state,
  onToggle,
  className,
}: {
  label: React.ReactNode;
  sortKey: K;
  state: SortState<K>;
  onToggle: (k: K) => void;
  className?: string;
}) {
  const active = state.key === sortKey;
  return (
    <TableHead
      className={`cursor-pointer select-none whitespace-nowrap hover:bg-muted/40 ${className ?? ""}`}
      onClick={() => onToggle(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          state.dir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </TableHead>
  );
}

export function useSortedRows<T, K extends string>(
  rows: T[],
  getters: Partial<Record<K, (row: T) => string | number | null | undefined>>,
  initial: SortState<K> = { key: null, dir: null },
) {
  const { state, toggle } = useSort<K>(initial);
  const sorted = useMemo(() => sortRows(rows, state, getters), [rows, state, getters]);
  return { sorted, sortState: state, toggleSort: toggle };
}
