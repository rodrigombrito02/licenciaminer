"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Anchor, Ship, Layers, Gem, Database } from "lucide-react";
import { fmtBR } from "@/lib/format";
import { CHART_TOOLTIP_STYLE, COLORS } from "./chart-helpers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/* ── Tipos de resposta ── */

interface OverviewRow {
  ano: number;
  mt: number;
  bi_usd: number;
  dr_mt: number;
  bf_mt: number;
}
interface OverviewResponse {
  por_ano: OverviewRow[];
  disponivel: boolean;
}
interface ShareRow {
  competidor: string;
  mt: number;
  pct: number;
}
interface RegiaoRow {
  regiao: string;
  mt: number;
  dr_mt: number;
  bf_mt: number;
}
interface QualidadeRow {
  ano: number;
  tipo: string;
  preco_medio: number;
  fe_medio: number;
}

function fmtMt(v: number): string {
  return `${fmtBR(v, 1)} Mt`;
}
function fmtUsdBi(v: number): string {
  return `US$ ${fmtBR(v, 1)} bi`;
}

const SHARE_COLORS = [
  COLORS.teal,
  COLORS.gold,
  COLORS.orange,
  COLORS.chart3,
  COLORS.chart4,
  COLORS.chart5,
  COLORS.muted,
];

export function TabPellets() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [share, setShare] = useState<ShareRow[] | null>(null);
  const [regioes, setRegioes] = useState<RegiaoRow[] | null>(null);
  const [qualidade, setQualidade] = useState<QualidadeRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ano = 2024;
    Promise.all([
      fetch(`${API}/mi/pellets/overview`)
        .then((r) => r.json())
        .then((d: OverviewResponse) => setOverview(d))
        .catch(() => setOverview({ por_ano: [], disponivel: false })),
      fetch(`${API}/mi/pellets/share?ano=${ano}`)
        .then((r) => r.json())
        .then((d: { competidores: ShareRow[] }) => setShare(d.competidores ?? []))
        .catch(() => setShare([])),
      fetch(`${API}/mi/pellets/regioes?ano=${ano}`)
        .then((r) => r.json())
        .then((d: { regioes: RegiaoRow[] }) => setRegioes(d.regioes ?? []))
        .catch(() => setRegioes([])),
      fetch(`${API}/mi/pellets/qualidade`)
        .then((r) => r.json())
        .then((d: { series: QualidadeRow[] }) => setQualidade(d.series ?? []))
        .catch(() => setQualidade([])),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const disponivel = overview?.disponivel ?? false;

  return (
    <div className="space-y-5">
      {/* Cabeçalho sênior */}
      <Card className="border-2 border-brand-teal/40 bg-gradient-to-br from-[#0A2540]/8 via-brand-teal/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-brand-teal/20 p-3 flex-shrink-0">
              <Anchor className="h-6 w-6 text-brand-teal" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-heading text-lg font-bold">
                  Análise Summo — Seaborne Iron Ore Pellet Market
                </h3>
                <Badge className="bg-brand-teal/15 text-brand-teal border-brand-teal/40 text-xs">
                  Base proprietária
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Leitura sênior do mercado transoceânico de pelotas de minério de ferro:
                evolução de volume, transição DR vs. BF (direct reduction / blast furnace),
                concentração competitiva e prêmio de qualidade. Amostra da base proprietária
                Summo — os números refletem os dados carregados no ambiente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!disponivel ? (
        <EmptyState />
      ) : (
        <>
          <KpiRow overview={overview!} />
          <MarketEvolution rows={overview!.por_ano} />
          <div className="grid lg:grid-cols-2 gap-4">
            <MarketShare rows={share ?? []} />
            <RegionSplit rows={regioes ?? []} />
          </div>
          <QualityPremium rows={qualidade ?? []} />
          <p className="text-[10px] text-muted-foreground/60">
            Fonte: Base proprietária Summo — Seaborne Iron Ore Pellet Market (amostra).
            DR = direct reduction · BF = blast furnace.
          </p>
        </>
      )}
    </div>
  );
}

/* ── Estado vazio ── */

function EmptyState() {
  return (
    <Card className="border-2 border-dashed border-brand-teal/30">
      <CardContent className="p-10 text-center space-y-3">
        <Database className="h-10 w-10 text-brand-teal/50 mx-auto" />
        <h3 className="font-heading text-base font-bold">Análise disponível sob demanda</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          A análise do mercado de pelotas está disponível no ambiente com a base
          proprietária carregada. Os dados não foram encontrados neste ambiente.
        </p>
      </CardContent>
    </Card>
  );
}

/* ── KPIs ── */

function KpiRow({ overview }: { overview: OverviewResponse }) {
  const rows = overview.por_ano;
  const last = rows.length ? rows[rows.length - 1] : null;
  const y2024 = rows.find((r) => r.ano === 2024) ?? last;

  const drPct =
    y2024 && y2024.mt > 0 ? (y2024.dr_mt / y2024.mt) * 100 : null;
  const bfPct = drPct != null ? 100 - drPct : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon={Ship}
        label={`Mercado total ${y2024?.ano ?? ""}`}
        value={y2024 ? fmtMt(y2024.mt) : "—"}
        sub="volume seaborne"
        color="text-brand-teal"
      />
      <KpiCard
        icon={Gem}
        label={`Valor ${y2024?.ano ?? ""}`}
        value={y2024 ? fmtUsdBi(y2024.bi_usd) : "—"}
        sub="valor de mercado"
        color="text-brand-gold"
      />
      <KpiCard
        icon={Layers}
        label="Split DR / BF"
        value={
          drPct != null && bfPct != null
            ? `${fmtBR(drPct, 0)} / ${fmtBR(bfPct, 0)}`
            : "—"
        }
        sub="direct reduction vs blast furnace (%)"
        color="text-brand-orange"
      />
      <KpiCard
        icon={Anchor}
        label="Cobertura da série"
        value={rows.length ? `${rows[0].ano}–${rows[rows.length - 1].ano}` : "—"}
        sub={`${rows.length} anos de dados`}
        color="text-brand-teal"
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        </div>
        <p className="text-xl font-bold font-tabular leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

/* ── Evolução do mercado (volume + split DR/BF empilhado) ── */

function MarketEvolution({ rows }: { rows: OverviewRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading">
          Evolução do mercado seaborne — volume e transição DR vs BF
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Barras empilhadas: pelotas para redução direta (DR) e alto-forno (BF); linha: valor de mercado (US$ bi)
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={rows} margin={{ top: 5, right: 55, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="ano" tick={{ fontSize: 10 }} stroke={COLORS.muted} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10 }}
                stroke={COLORS.muted}
                tickFormatter={(v: number) => `${fmtBR(v, 0)}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
                stroke={COLORS.muted}
                tickFormatter={(v: number) => `${fmtBR(v, 0)}`}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value, name) => {
                  if (name === "Valor (US$ bi)") return [fmtUsdBi(Number(value)), name];
                  return [fmtMt(Number(value)), name];
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="dr_mt"
                name="DR (Mt)"
                stackId="vol"
                fill={COLORS.teal}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="bf_mt"
                name="BF (Mt)"
                stackId="vol"
                fill={COLORS.orange}
                radius={[3, 3, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bi_usd"
                name="Valor (US$ bi)"
                stroke={COLORS.gold}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Market share por competidor ── */

function MarketShare({ rows }: { rows: ShareRow[] }) {
  const sorted = rows.slice().sort((a, b) => b.mt - a.mt);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading">Market share por competidor (2024)</CardTitle>
        <p className="text-[11px] text-muted-foreground">Volume seaborne por produtor (Mt e %)</p>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyChart />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(240, sorted.length * 34 + 20)}>
              <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  stroke={COLORS.muted}
                  tickFormatter={(v: number) => `${fmtBR(v, 0)}`}
                />
                <YAxis type="category" dataKey="competidor" tick={{ fontSize: 10 }} stroke={COLORS.muted} width={90} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(v, _n, item) => [
                    `${fmtMt(Number(v))} · ${fmtBR((item?.payload as ShareRow)?.pct ?? 0, 1)}%`,
                    "Volume",
                  ]}
                />
                <Bar dataKey="mt" radius={[0, 4, 4, 0]} name="Volume">
                  {sorted.map((_, i) => (
                    <Cell key={i} fill={SHARE_COLORS[i % SHARE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-2">
              {sorted.map((r, i) => (
                <span
                  key={r.competidor}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: SHARE_COLORS[i % SHARE_COLORS.length] }}
                  />
                  {r.competidor} · {fmtBR(r.pct, 1)}%
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Volume por região (split DR/BF) ── */

function RegionSplit({ rows }: { rows: RegiaoRow[] }) {
  const sorted = rows.slice().sort((a, b) => b.mt - a.mt);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading">Volume por região de destino (2024)</CardTitle>
        <p className="text-[11px] text-muted-foreground">Split DR (redução direta) e BF (alto-forno), em Mt</p>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, sorted.length * 40 + 20)}>
            <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                stroke={COLORS.muted}
                tickFormatter={(v: number) => `${fmtBR(v, 0)}`}
              />
              <YAxis type="category" dataKey="regiao" tick={{ fontSize: 10 }} stroke={COLORS.muted} width={100} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(v, name) => [fmtMt(Number(v)), name]}
              />
              <Legend />
              <Bar dataKey="dr_mt" name="DR (Mt)" stackId="r" fill={COLORS.teal} />
              <Bar dataKey="bf_mt" name="BF (Mt)" stackId="r" fill={COLORS.orange} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Prêmio de qualidade (preço ajustado + Fe médio por tipo) ── */

function QualityPremium({ rows }: { rows: QualidadeRow[] }) {
  // Pivot por ano: preço e Fe por tipo (DR / BF)
  const tipos = Array.from(new Set(rows.map((r) => r.tipo)));
  const anos = Array.from(new Set(rows.map((r) => r.ano))).sort((a, b) => a - b);
  const pivot = anos.map((ano) => {
    const rec: Record<string, number | string> = { ano };
    for (const t of tipos) {
      const found = rows.find((r) => r.ano === ano && r.tipo === t);
      if (found) {
        rec[`preco_${t}`] = found.preco_medio;
        rec[`fe_${t}`] = found.fe_medio;
      }
    }
    return rec;
  });

  const tipoColor = (t: string, i: number) =>
    /dr/i.test(t) ? COLORS.teal : /bf/i.test(t) ? COLORS.orange : SHARE_COLORS[i % SHARE_COLORS.length];

  // Última leitura por tipo para a tabela-resumo
  const latestByTipo = tipos.map((t) => {
    const seq = rows.filter((r) => r.tipo === t).sort((a, b) => b.ano - a.ano);
    return seq[0];
  }).filter(Boolean) as QualidadeRow[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading">Prêmio de qualidade — preço ajustado e teor de Fe</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Preço médio ajustado por tipo (DR vs BF); teor de ferro médio (%)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <EmptyChart />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={pivot} margin={{ top: 5, right: 55, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="ano" tick={{ fontSize: 10 }} stroke={COLORS.muted} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  stroke={COLORS.muted}
                  tickFormatter={(v: number) => `${fmtBR(v, 0)}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[55, 70]}
                  tick={{ fontSize: 10 }}
                  stroke={COLORS.muted}
                  tickFormatter={(v: number) => `${fmtBR(v, 0)}%`}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value, name) => {
                    if (String(name).startsWith("Fe")) return [`${fmtBR(Number(value), 1)}%`, name];
                    return [`US$ ${fmtBR(Number(value), 1)}/t`, name];
                  }}
                />
                <Legend />
                {tipos.map((t, i) => (
                  <Line
                    key={`preco_${t}`}
                    yAxisId="left"
                    type="monotone"
                    dataKey={`preco_${t}`}
                    name={`Preço ${t} (US$/t)`}
                    stroke={tipoColor(t, i)}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
                {tipos.map((t, i) => (
                  <Area
                    key={`fe_${t}`}
                    yAxisId="right"
                    type="monotone"
                    dataKey={`fe_${t}`}
                    name={`Fe ${t} (%)`}
                    stroke={tipoColor(t, i)}
                    fill={tipoColor(t, i)}
                    fillOpacity={0.08}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    dot={false}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>

            {latestByTipo.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Ano</TableHead>
                    <TableHead className="text-right">Preço médio (US$/t)</TableHead>
                    <TableHead className="text-right">Fe médio (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestByTipo.map((r) => (
                    <TableRow key={r.tipo}>
                      <TableCell className="font-medium">{r.tipo}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.ano}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        US$ {fmtBR(r.preco_medio, 1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBR(r.fe_medio, 1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      Dados não disponíveis para esta visualização.
    </p>
  );
}
