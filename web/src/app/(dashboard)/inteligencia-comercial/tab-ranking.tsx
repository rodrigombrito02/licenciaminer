"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Factory, MapPin, FlaskConical, type LucideIcon } from "lucide-react";
import { fmtBR } from "@/lib/format";
import { CHART_TOOLTIP_STYLE, COLORS } from "./chart-helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const TODOS = "__todos__";

interface RalMeta {
  anos: string[];
  substancias: string[];
  ufs: string[];
}

interface EstadoRow {
  estado: string;
  qtd_t: number;
}
interface SubstanciaRow {
  substancia: string;
  qtd_t: number;
}

interface ProducaoResponse {
  ano: number;
  por_estado: EstadoRow[];
  por_substancia: SubstanciaRow[];
  total_t: number;
}

/** Formata toneladas: usa Mt quando grande, senão milhares de t. */
function fmtTon(v: number): string {
  if (v >= 1_000_000) return `${fmtBR(v / 1_000_000, 2)} Mt`;
  if (v >= 1_000) return `${fmtBR(v / 1_000, 1)} mil t`;
  return `${fmtBR(v, 0)} t`;
}

export function RankingTab() {
  const [meta, setMeta] = useState<RalMeta | null>(null);
  const [ano, setAno] = useState("2024");
  const [substancia, setSubstancia] = useState<string>(TODOS);
  const [uf, setUf] = useState<string>(TODOS);
  const [data, setData] = useState<ProducaoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega metadados (anos / substâncias / ufs)
  useEffect(() => {
    fetch(`${API}/mi/ral/meta`)
      .then((r) => r.json())
      .then((m: RalMeta) => {
        setMeta(m);
        if (m.anos?.length && !m.anos.includes("2024")) {
          setAno(m.anos[m.anos.length - 1]);
        }
      })
      .catch(() => setMeta({ anos: ["2024"], substancias: [], ufs: [] }));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ ano });
    if (substancia !== TODOS) qs.set("substancia", substancia);
    if (uf !== TODOS) qs.set("uf", uf);
    fetch(`${API}/mi/ral/producao?${qs}`)
      .then((r) => r.json())
      .then((d: ProducaoResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ano, substancia, uf]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="rounded-xl bg-gradient-to-r from-brand-teal/10 to-brand-gold/10 border border-brand-teal/30 p-5">
        <div className="flex items-start gap-3">
          <Factory className="h-5 w-5 text-brand-teal flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm mb-1">Produção Mineral Beneficiada</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Volume de produção beneficiada declarado no Relatório Anual de Lavra (RAL)
              da ANM, por estado e por substância. Filtre por ano, substância e UF
              para explorar a distribuição da produção mineral brasileira.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <FilterSelect
          label="Ano"
          value={ano}
          onChange={setAno}
          options={meta?.anos ?? ["2024"]}
        />
        <FilterSelect
          label="Substância"
          value={substancia}
          onChange={setSubstancia}
          options={meta?.substancias ?? []}
          allLabel="Todas as substâncias"
        />
        <FilterSelect
          label="UF"
          value={uf}
          onChange={setUf}
          options={meta?.ufs ?? []}
          allLabel="Todas as UFs"
        />
        {data && !loading && (
          <div className="ml-auto flex items-end">
            <div className="rounded-lg border bg-muted/30 px-4 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Total beneficiado ({data.ano})
              </p>
              <p className="text-lg font-bold font-tabular text-brand-teal leading-tight">
                {fmtTon(data.total_t)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4">
        <RankingBarCard
          title="Produção por Estado"
          subtitle="Toneladas beneficiadas"
          icon={MapPin}
          rows={data?.por_estado.map((r) => ({ nome: r.estado, valor: r.qtd_t })) ?? null}
          color={COLORS.teal}
          loading={loading}
        />
        <RankingBarCard
          title="Produção por Substância"
          subtitle="Toneladas beneficiadas"
          icon={FlaskConical}
          rows={data?.por_substancia.map((r) => ({ nome: r.substancia, valor: r.qtd_t })) ?? null}
          color={COLORS.orange}
          loading={loading}
        />
      </div>

      <p className="text-[10px] text-muted-foreground/60">
        Fonte: ANM RAL — produção beneficiada. Valores em toneladas.
      </p>
    </div>
  );
}

/* ── Filtro ── */

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allLabel && (
            <SelectItem value={TODOS} className="text-xs">
              {allLabel}
            </SelectItem>
          )}
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-xs">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ── Bar Card ── */

function RankingBarCard({
  title,
  subtitle,
  icon: Icon,
  rows,
  color,
  loading,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  rows: { nome: string; valor: number }[] | null;
  color: string;
  loading: boolean;
}) {
  const top = (rows ?? []).slice(0, 15);
  const max = top.length ? Math.max(...top.map((r) => r.valor)) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} />
          {title}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : top.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sem dados para os filtros selecionados.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(280, top.length * 26 + 30)}>
              <BarChart
                data={top}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  stroke={COLORS.muted}
                  tickFormatter={(v: number) => fmtTon(v)}
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  tick={{ fontSize: 10 }}
                  stroke={COLORS.muted}
                  width={110}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(v) => [fmtTon(Number(v)), "Produção"]}
                />
                <Bar dataKey="valor" fill={color} radius={[0, 4, 4, 0]} name="Produção" />
              </BarChart>
            </ResponsiveContainer>
            {/* Tabela compacta */}
            <div className="mt-3 space-y-1">
              {top.map((r) => (
                <div
                  key={r.nome}
                  className="flex items-center justify-between text-xs border-b border-border/40 py-1 last:border-0"
                >
                  <span className="truncate font-medium">{r.nome}</span>
                  <span className="tabular-nums text-muted-foreground flex-shrink-0">
                    {fmtTon(r.valor)}
                    {max > 0 && (
                      <span className="ml-2 text-[10px] text-muted-foreground/60">
                        {fmtBR((r.valor / max) * 100, 0)}%
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
