"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { ShoppingCart, DollarSign, Scale, Coins } from "lucide-react";
import { fmtBR, fmtReais } from "@/lib/format";
import { CHART_TOOLTIP_STYLE, COLORS } from "./chart-helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const TODOS = "__todos__";

interface RalMeta {
  anos: string[];
  substancias: string[];
  ufs: string[];
}

interface VendaLinha {
  substancia: string;
  uf: string;
  qtd_t: number;
  valor_rs: number;
  valor_unitario_rs: number;
}

interface VendasResponse {
  ano: number;
  linhas: VendaLinha[];
  total_valor: number;
  total_qtd: number;
}

function fmtTon(v: number): string {
  if (v >= 1_000_000) return `${fmtBR(v / 1_000_000, 2)} Mt`;
  if (v >= 1_000) return `${fmtBR(v / 1_000, 1)} mil t`;
  return `${fmtBR(v, 0)} t`;
}

function fmtReaisCompact(v: number): string {
  if (v >= 1e9) return `R$ ${fmtBR(v / 1e9, 2)} bi`;
  if (v >= 1e6) return `R$ ${fmtBR(v / 1e6, 1)} mi`;
  if (v >= 1e3) return `R$ ${fmtBR(v / 1e3, 0)} mil`;
  return fmtReais(v);
}

interface ProducaoTabProps {
  activeMetric: string;
  onMetricChange: (id: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProducaoTab(_props: ProducaoTabProps) {
  const [meta, setMeta] = useState<RalMeta | null>(null);
  const [ano, setAno] = useState("2024");
  const [substancia, setSubstancia] = useState<string>(TODOS);
  const [uf, setUf] = useState<string>(TODOS);
  const [data, setData] = useState<VendasResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
    fetch(`${API}/mi/ral/vendas?${qs}`)
      .then((r) => r.json())
      .then((d: VendasResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ano, substancia, uf]);

  useEffect(() => {
    load();
  }, [load]);

  const linhas = useMemo(
    () => (data?.linhas ?? []).slice().sort((a, b) => b.valor_rs - a.valor_rs),
    [data]
  );

  const chartTop = useMemo(
    () =>
      linhas.slice(0, 15).map((l) => ({
        nome: uf !== TODOS || substancia === TODOS ? l.substancia : `${l.substancia} · ${l.uf}`,
        valor: l.valor_rs,
      })),
    [linhas, uf, substancia]
  );

  const precoMedio =
    data && data.total_qtd > 0 ? data.total_valor / data.total_qtd : 0;

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="rounded-xl bg-gradient-to-r from-brand-gold/10 to-brand-orange/10 border border-brand-gold/30 p-5">
        <div className="flex items-start gap-3">
          <ShoppingCart className="h-5 w-5 text-brand-gold flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm mb-1">Comercialização da Produção Beneficiada</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vendas de produção mineral beneficiada declaradas no RAL (ANM): quantidade,
              valor total e valor unitário por substância e UF. Filtre para analisar
              o mix de receita e o preço médio praticado.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <FilterSelect label="Ano" value={ano} onChange={setAno} options={meta?.anos ?? ["2024"]} />
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
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Valor comercializado"
            value={fmtReaisCompact(data.total_valor)}
            subtitle={`total de vendas em ${data.ano}`}
            icon={DollarSign}
            accentClass="bg-brand-gold"
          />
          <StatCard
            label="Quantidade vendida"
            value={fmtTon(data.total_qtd)}
            subtitle="produção beneficiada comercializada"
            icon={Scale}
            accentClass="bg-brand-teal"
          />
          <StatCard
            label="Valor unitário médio"
            value={`${fmtReais(precoMedio)}/t`}
            subtitle="preço médio ponderado"
            icon={Coins}
            accentClass="bg-brand-orange"
          />
        </div>
      ) : null}

      {/* Gráfico valor por linha */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading">Valor comercializado (Top 15)</CardTitle>
          <p className="text-[11px] text-muted-foreground">Receita por substância/UF (R$)</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : chartTop.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sem dados para os filtros selecionados.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(300, chartTop.length * 28 + 30)}>
              <BarChart data={chartTop} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  stroke={COLORS.muted}
                  tickFormatter={(v: number) => fmtReaisCompact(v)}
                />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} stroke={COLORS.muted} width={140} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(v) => [fmtReaisCompact(Number(v)), "Valor"]}
                />
                <Bar dataKey="valor" fill={COLORS.gold} radius={[0, 4, 4, 0]} name="Valor" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading">Detalhamento por substância / UF</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Quantidade (t), valor total (R$) e valor unitário (R$/t)
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : linhas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sem dados para os filtros selecionados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Substância</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead className="text-right">Quantidade (t)</TableHead>
                  <TableHead className="text-right">Valor total (R$)</TableHead>
                  <TableHead className="text-right">Valor unit. (R$/t)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l, i) => (
                  <TableRow key={`${l.substancia}-${l.uf}-${i}`}>
                    <TableCell className="font-medium">{l.substancia}</TableCell>
                    <TableCell>{l.uf}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBR(l.qtd_t, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtReais(l.valor_rs)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtReais(l.valor_unitario_rs)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground/60">
        Fonte: ANM RAL — venda de produção beneficiada. Valores em Reais (R$) correntes.
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
