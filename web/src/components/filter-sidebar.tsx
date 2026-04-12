"use client";

import { useEffect, useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  fetchDecisionFilterOptions,
  type DecisionFilters,
  type FilterOptions,
} from "@/lib/api";

interface FilterSidebarProps {
  filters: DecisionFilters;
  onChange: (filters: DecisionFilters) => void;
}

const EMPTY_FILTERS: DecisionFilters = {};

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const [options, setOptions] = useState<FilterOptions | null>(null);

  useEffect(() => {
    fetchDecisionFilterOptions().then(setOptions).catch(() => {});
  }, []);

  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== false && v !== null
  );

  function set(key: keyof DecisionFilters, value: string | number | boolean | undefined) {
    onChange({ ...filters, [key]: value });
  }

  function clear() {
    onChange(EMPTY_FILTERS);
  }

  if (!options) return null;

  return (
    <aside className="hidden xl:flex xl:flex-col xl:w-64 shrink-0 rounded-xl border bg-card p-4 space-y-4 h-fit sticky top-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4 text-brand-teal" />
          Filtros
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear} className="h-7 text-xs text-muted-foreground">
            <RotateCcw className="mr-1 h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      {/* Regional */}
      <FilterSelect
        label="Regional"
        value={filters.regional}
        options={options.regional.map((r) => ({
          value: r,
          label: r
            .replace("Unidade Regional de Regularização Ambiental ", "URA ")
            .replace("Unidade Regional de Gestão das Águas ", "URA Águas ")
            .replace("Diretoria de Gestão Regional", "DGR"),
        }))}
        onChange={(v) => set("regional", v)}
      />

      {/* Modalidade */}
      <FilterSelect
        label="Modalidade"
        value={filters.modalidade}
        options={options.modalidade.filter(Boolean).slice(0, 15).map((m) => ({
          value: m,
          label: m,
        }))}
        onChange={(v) => set("modalidade", v)}
      />

      {/* Classe */}
      <FilterSelect
        label="Classe"
        value={filters.classe != null ? String(filters.classe) : undefined}
        options={options.classe.map((c) => ({
          value: String(c),
          label: `Classe ${c}`,
        }))}
        onChange={(v) => set("classe", v ? Number(v) : undefined)}
      />

      {/* Atividade */}
      <FilterSelect
        label="Atividade"
        value={filters.atividade}
        options={options.atividade_tipologia.map((a) => ({
          value: a.letra,
          label: `${a.label} (${a.n})`,
        }))}
        onChange={(v) => set("atividade", v)}
      />

      {/* Decisão */}
      <FilterSelect
        label="Decisão"
        value={filters.decisao}
        options={options.decisao.map((d) => ({
          value: d,
          label: d.charAt(0).toUpperCase() + d.slice(1),
        }))}
        onChange={(v) => set("decisao", v)}
      />

      {/* Mineração apenas */}
      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          id="mining-only"
          checked={filters.mining_only ?? false}
          onCheckedChange={(v) => set("mining_only", v === true ? true : undefined)}
        />
        <label htmlFor="mining-only" className="text-xs text-muted-foreground cursor-pointer">
          Somente mineração
        </label>
      </div>

      {/* Limpar todos */}
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={clear} className="w-full mt-2">
          Limpar todos os filtros
        </Button>
      )}
    </aside>
  );
}

/* ── Reusable filter select ── */

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <Select
        value={value ?? "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? undefined : v)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
