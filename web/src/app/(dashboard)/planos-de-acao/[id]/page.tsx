"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Filter,
  X,
  CalendarRange,
  GitBranch,
  Table as TableIcon,
  PieChart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { paApi, type PaPlano, type PaTarefa } from "@/lib/api";
import { Gantt } from "@/components/planos-acao/gantt";
import { Donut } from "@/components/planos-acao/donut";
import { EapTree } from "@/components/planos-acao/eap-tree";

const STATUS_COLORS: Record<string, string> = {
  concluido: "#27AE60",
  concluído: "#27AE60",
  "em andamento": "#3498DB",
  "em execucao": "#3498DB",
  atrasado: "#E74C3C",
  "nao iniciado": "#9CA3AF",
  "não iniciado": "#9CA3AF",
  pendente: "#9CA3AF",
  bloqueado: "#FF5F00",
  cancelado: "#6B7280",
};
function statusColor(s: string) {
  return STATUS_COLORS[s.toLowerCase().trim()] ?? "#156082";
}

const AREA_PALETTE = ["#156082", "#FFC000", "#FF5F00", "#27AE60", "#9333EA", "#0EA5E9", "#EC4899", "#84CC16"];

interface Filters {
  status: Set<string>;
  responsavel: Set<string>;
  area: Set<string>;
  classificacao: Set<string>;
  search: string;
  /** filtros por raw_extra: {nomeColuna: Set<valor>} */
  extras: Record<string, Set<string>>;
}

const EMPTY_FILTERS: Filters = {
  status: new Set(), responsavel: new Set(), area: new Set(),
  classificacao: new Set(), search: "", extras: {},
};

export default function PlanoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const planoId = Number(id);
  const [plano, setPlano] = useState<PaPlano | null>(null);
  const [tarefas, setTarefas] = useState<PaTarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    (async () => {
      try {
        const [p, ts] = await Promise.all([
          paApi.detalhePlano(planoId),
          paApi.tarefasDoPlano(planoId),
        ]);
        setPlano(p);
        setTarefas(ts);
      } finally {
        setLoading(false);
      }
    })();
  }, [planoId]);

  // ── Filtragem ──
  const filtered = useMemo(() => {
    return tarefas.filter(t => {
      if (filters.status.size > 0 && !filters.status.has(t.status || "")) return false;
      if (filters.responsavel.size > 0 && !filters.responsavel.has(t.responsavel_pessoa || "")) return false;
      if (filters.area.size > 0 && !filters.area.has(t.area_responsavel || "")) return false;
      if (filters.classificacao.size > 0 && !filters.classificacao.has(t.classificacao || "")) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const hay = `${t.descricao} ${t.eap_codigo} ${t.responsavel_pessoa} ${t.area_responsavel} ${t.status}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      for (const [col, vals] of Object.entries(filters.extras)) {
        if (vals.size > 0) {
          const v = String(t.raw_extra?.[col] ?? "");
          if (!vals.has(v)) return false;
        }
      }
      return true;
    });
  }, [tarefas, filters]);

  // ── Agregações ──
  const stats = useMemo(() => {
    const countBy = (fn: (t: PaTarefa) => string | null) => {
      const r: Record<string, number> = {};
      for (const t of filtered) {
        const k = fn(t) || "(sem)";
        r[k] = (r[k] || 0) + 1;
      }
      return r;
    };
    const status = countBy(t => t.status);
    const resp = countBy(t => t.responsavel_pessoa);
    const area = countBy(t => t.area_responsavel);
    const classif = countBy(t => t.classificacao);

    const concluido = filtered.filter(t => /concluido|concluído/i.test(t.status || "")).length;
    const atrasado = filtered.filter(t => {
      if (!t.data_fim) return false;
      const fim = new Date(t.data_fim);
      const hoje = new Date();
      return fim < hoje && !/concluido|concluído/i.test(t.status || "");
    }).length;
    const pctMedio = filtered.length > 0
      ? Math.round(filtered.reduce((s, t) => s + (t.pct_concluido ?? 0), 0) / filtered.length)
      : 0;

    return {
      total: filtered.length, status, resp, area, classif,
      concluido, atrasado, pctMedio,
    };
  }, [filtered]);

  // ── Domínios para filtros ──
  const domains = useMemo(() => {
    const uniq = (fn: (t: PaTarefa) => string | null) => {
      const s = new Set<string>();
      for (const t of tarefas) {
        const v = fn(t);
        if (v) s.add(v);
      }
      return Array.from(s).sort();
    };
    const extraCols = new Set<string>();
    for (const t of tarefas) {
      if (t.raw_extra) Object.keys(t.raw_extra).forEach(k => extraCols.add(k));
    }
    const extras: Record<string, string[]> = {};
    for (const col of extraCols) {
      const vals = new Set<string>();
      for (const t of tarefas) {
        const v = t.raw_extra?.[col];
        if (v !== null && v !== undefined && v !== "") vals.add(String(v));
      }
      extras[col] = Array.from(vals).sort();
    }
    return {
      status: uniq(t => t.status),
      responsavel: uniq(t => t.responsavel_pessoa),
      area: uniq(t => t.area_responsavel),
      classificacao: uniq(t => t.classificacao),
      extras,
    };
  }, [tarefas]);

  if (loading) return (
    <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-teal" /></div>
  );
  if (!plano) return <div className="p-6">Plano não encontrado</div>;

  function toggleFilter(field: keyof Pick<Filters, "status" | "responsavel" | "area" | "classificacao">, value: string) {
    setFilters(prev => {
      const next = new Set(prev[field]);
      next.has(value) ? next.delete(value) : next.add(value);
      return { ...prev, [field]: next };
    });
  }

  function toggleExtraFilter(col: string, value: string) {
    setFilters(prev => {
      const cur = new Set(prev.extras[col] || []);
      cur.has(value) ? cur.delete(value) : cur.add(value);
      return { ...prev, extras: { ...prev.extras, [col]: cur } };
    });
  }

  function clearAll() {
    setFilters(EMPTY_FILTERS);
  }

  const hasActiveFilters =
    filters.status.size > 0 || filters.responsavel.size > 0 ||
    filters.area.size > 0 || filters.classificacao.size > 0 ||
    filters.search.length > 0 ||
    Object.values(filters.extras).some(s => s.size > 0);

  // Slices para donuts
  const statusSlices = Object.entries(stats.status).map(([k, v]) => ({
    label: k, value: v, color: statusColor(k),
  }));
  const areaSlices = Object.entries(stats.area).slice(0, 8).map(([k, v], i) => ({
    label: k, value: v, color: AREA_PALETTE[i % AREA_PALETTE.length],
  }));

  return (
    <div className="space-y-4 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-2">
        <Link href="/planos-de-acao" className="text-sm text-brand-teal hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-3 w-3 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <FileSpreadsheet className="h-6 w-6 text-brand-teal flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold">{plano.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {plano.arquivo_origem && `${plano.arquivo_origem} · `}
            {tarefas.length} tarefas {hasActiveFilters && ` (mostrando ${filtered.length} após filtros)`} · v{plano.versao}
          </p>
        </div>
      </div>

      {/* KPI strip — drill-down: clica e filtra */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Total" value={stats.total} color="#0A2540" />
        <KPICard
          label="Concluídas"
          value={stats.concluido}
          color="#27AE60"
          active={filters.status.has("Concluido") || filters.status.has("Concluído")}
          onClick={() => toggleFilter("status", findKey(domains.status, /concluido|concluído/i) || "Concluido")}
        />
        <KPICard
          label="Atrasadas"
          value={stats.atrasado}
          color="#E74C3C"
        />
        <KPICard
          label="% médio"
          value={`${stats.pctMedio}%`}
          color="#156082"
        />
        <KPICard
          label="Sem responsável"
          value={tarefas.filter(t => !t.responsavel_pessoa).length}
          color="#FF5F00"
          active={filters.responsavel.has("")}
          onClick={() => toggleFilter("responsavel", "")}
        />
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        {/* ── Painel de filtros ── */}
        <aside className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-teal" /> Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Buscar..."
                value={filters.search}
                onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
                className="text-xs"
              />

              <FilterGroup
                title="Status"
                values={domains.status}
                active={filters.status}
                onToggle={(v) => toggleFilter("status", v)}
              />
              <FilterGroup
                title="Responsável"
                values={domains.responsavel}
                active={filters.responsavel}
                onToggle={(v) => toggleFilter("responsavel", v)}
                maxShow={8}
              />
              <FilterGroup
                title="Área"
                values={domains.area}
                active={filters.area}
                onToggle={(v) => toggleFilter("area", v)}
              />
              <FilterGroup
                title="Classificação"
                values={domains.classificacao}
                active={filters.classificacao}
                onToggle={(v) => toggleFilter("classificacao", v)}
              />

              {Object.entries(domains.extras).map(([col, vals]) => (
                <FilterGroup
                  key={col}
                  title={`+ ${col}`}
                  values={vals}
                  active={filters.extras[col] ?? new Set()}
                  onToggle={(v) => toggleExtraFilter(col, v)}
                  isExtra
                  maxShow={6}
                />
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* ── Visualizações ── */}
        <main className="space-y-4 min-w-0">
          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-brand-teal" /> Por Status</CardTitle></CardHeader>
              <CardContent>
                <Donut
                  slices={statusSlices}
                  centerValue={stats.total}
                  centerLabel="tarefas"
                  onSliceClick={(label) => toggleFilter("status", label === "(sem)" ? "" : label)}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-brand-teal" /> Por Área Responsável</CardTitle></CardHeader>
              <CardContent>
                <Donut
                  slices={areaSlices}
                  centerValue={Object.keys(stats.area).length}
                  centerLabel="áreas"
                  onSliceClick={(label) => toggleFilter("area", label === "(sem)" ? "" : label)}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <Tabs defaultValue="gantt">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Visualizações</CardTitle>
                <TabsList>
                  <TabsTrigger value="gantt"><CalendarRange className="h-3 w-3 mr-1" /> Gantt</TabsTrigger>
                  <TabsTrigger value="eap"><GitBranch className="h-3 w-3 mr-1" /> EAP</TabsTrigger>
                  <TabsTrigger value="tabela"><TableIcon className="h-3 w-3 mr-1" /> Tabela</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="p-0">
                <TabsContent value="gantt" className="m-0">
                  <Gantt tarefas={filtered} />
                </TabsContent>
                <TabsContent value="eap" className="m-0">
                  <EapTree tarefas={filtered} />
                </TabsContent>
                <TabsContent value="tabela" className="m-0">
                  <TabelaTarefas tarefas={filtered} extraCols={Object.keys(domains.extras)} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Ranking por Responsável</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(stats.resp).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, n]) => {
                  const max = Math.max(...Object.values(stats.resp));
                  const pct = (n / max) * 100;
                  return (
                    <div key={nome} className="flex items-center gap-2 text-xs">
                      <span className="w-32 truncate">{nome}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-brand-teal/70" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums font-medium">{n}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

function findKey(arr: string[], rx: RegExp): string | undefined {
  return arr.find(s => rx.test(s));
}

function KPICard({ label, value, color, onClick, active }: {
  label: string; value: number | string; color: string;
  onClick?: () => void; active?: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      className={`rounded-lg border bg-card p-3 transition-colors text-left ${onClick ? "hover:bg-muted/40 cursor-pointer" : ""} ${active ? "ring-2 ring-brand-teal" : ""}`}
      onClick={onClick}
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <div className="text-2xl font-bold font-tabular" style={{ color }}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Wrapper>
  );
}

function FilterGroup({
  title, values, active, onToggle, maxShow = 12, isExtra = false,
}: {
  title: string; values: string[]; active: Set<string>; onToggle: (v: string) => void;
  maxShow?: number; isExtra?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  if (values.length === 0) return null;
  const shown = showAll ? values : values.slice(0, maxShow);
  return (
    <div>
      <div className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${isExtra ? "text-brand-orange" : "text-muted-foreground"}`}>
        {title}
      </div>
      <div className="space-y-1">
        {shown.map(v => (
          <label key={v} className="flex items-center gap-2 text-xs cursor-pointer hover:text-brand-navy">
            <input
              type="checkbox"
              checked={active.has(v)}
              onChange={() => onToggle(v)}
              className="accent-brand-teal"
            />
            <span className="truncate flex-1" title={v}>{v}</span>
          </label>
        ))}
        {values.length > maxShow && (
          <button onClick={() => setShowAll(!showAll)} className="text-[10px] text-brand-teal hover:underline">
            {showAll ? "ver menos" : `+ ver mais ${values.length - maxShow}`}
          </button>
        )}
      </div>
    </div>
  );
}

function TabelaTarefas({ tarefas, extraCols }: { tarefas: PaTarefa[]; extraCols: string[] }) {
  return (
    <div className="overflow-auto max-h-[600px]">
      <table className="w-full text-xs">
        <thead className="bg-muted sticky top-0">
          <tr>
            <th className="text-left p-2">EAP</th>
            <th className="text-left p-2">Descrição</th>
            <th className="text-left p-2">Início</th>
            <th className="text-left p-2">Fim</th>
            <th className="text-left p-2">Responsável</th>
            <th className="text-left p-2">Área</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">%</th>
            {extraCols.map(col => (
              <th key={col} className="text-left p-2 text-brand-orange">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tarefas.map(t => (
            <tr key={t.id} className="border-t hover:bg-muted/30">
              <td className="p-2 font-mono">{t.eap_codigo || "-"}</td>
              <td className="p-2" style={{ paddingLeft: `${8 + ((t.eap_nivel ?? 1) - 1) * 10}px` }}>
                {t.descricao}
              </td>
              <td className="p-2">{t.data_inicio || "-"}</td>
              <td className="p-2">{t.data_fim || "-"}</td>
              <td className="p-2">{t.responsavel_pessoa || "-"}</td>
              <td className="p-2">{t.area_responsavel || "-"}</td>
              <td className="p-2">
                {t.status ? (
                  <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                ) : "-"}
              </td>
              <td className="p-2 text-right tabular-nums">{t.pct_concluido != null ? `${t.pct_concluido}%` : "-"}</td>
              {extraCols.map(col => (
                <td key={col} className="p-2 text-muted-foreground">
                  {String(t.raw_extra?.[col] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
