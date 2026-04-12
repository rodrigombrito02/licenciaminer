"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  ExternalLink,
  FileText,
  FileWarning,
  Loader2,
  Search,
  TrendingDown,
  MapPin,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from "recharts";
import { TrendChart } from "../trend-chart";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  fetchApprovalRates,
  fetchDecisionsByModalidade,
  fetchRejectionTrend,
  fetchRegionalRigor,
  fetchInfractionBands,
  fetchInfractionsVsApproval,
  fetchActivityClassHeatmap,
  fetchCfemVsApproval,
  fetchRecidivism,
  fetchShelvingAnalysis,
  fetchEmpresa,
  fetchEmpresaDecisions,
  fetchTopEmpresas,
  fetchCopamMeetings,
  fetchOverviewStats,
  fetchOverviewTrend,
  fetchOverviewInsights,
  fetchDecisionSummary,
  fetchDecisionInsights,
  fmtNumber,
  fmtPct,
  type OverviewStats,
  type TrendPoint,
  type Insight,
  type RejectionTrend,
  type RegionalRigor,
  type InfractionBand,
  type InfractionsVsApproval,
  type ActivityClassHeatmap,
  type CfemVsApproval,
  type RecidivismBand,
  type ShelvingAnalysis,
  type DecisionFilters,
  type DecisionSummary,
  type ContextualInsight,
  type EmpresaProfile,
  type Decision,
  type TopEmpresa,
  type CopamResponse,
} from "@/lib/api";
import { fmtCNPJ, fmtDate, fmtReais } from "@/lib/format";
import { FilterSidebar } from "@/components/filter-sidebar";

const CHART_TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: 13,
};

export default function DecisoesPage() {
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [rejectionTrend, setRejectionTrend] = useState<RejectionTrend[] | null>(null);
  const [regionalRigor, setRegionalRigor] = useState<RegionalRigor[] | null>(null);
  const [modalidade, setModalidade] = useState<Record<string, unknown>[] | null>(null);
  const [approvalRates, setApprovalRates] = useState<Record<string, unknown>[] | null>(null);
  const [infractionBands, setInfractionBands] = useState<InfractionBand[] | null>(null);
  const [infractionsVsApproval, setInfractionsVsApproval] = useState<InfractionsVsApproval[] | null>(null);
  const [heatmapData, setHeatmapData] = useState<ActivityClassHeatmap[] | null>(null);
  const [cfemVsApproval, setCfemVsApproval] = useState<CfemVsApproval[] | null>(null);
  const [recidivism, setRecidivism] = useState<RecidivismBand[] | null>(null);
  const [shelvingData, setShelvingData] = useState<ShelvingAnalysis[] | null>(null);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [overviewTrend, setOverviewTrend] = useState<TrendPoint[] | null>(null);
  const [overviewInsights, setOverviewInsights] = useState<Insight[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DecisionFilters>({});
  const [filteredSummary, setFilteredSummary] = useState<DecisionSummary | null>(null);
  const [contextInsights, setContextInsights] = useState<ContextualInsight[] | null>(null);

  // Reload summary & insights when filters change
  useEffect(() => {
    fetchDecisionSummary(filters).then(setFilteredSummary).catch(() => {});
    fetchDecisionInsights(filters).then(setContextInsights).catch(() => {});
  }, [filters]);

  // Lazy-load: fetch only when the relevant tab is selected (or for KPI row).
  // Each dataset fetches once and caches in state.
  const lazyFetch = useCallback(<T,>(
    current: T | null,
    setter: (v: T) => void,
    fetcher: () => Promise<T>,
  ) => {
    if (current !== null) return;
    fetcher().then(setter).catch((e) => console.error(e));
  }, []);

  // Always load KPI row data + overview tab data on mount
  useEffect(() => {
    fetchRejectionTrend().then(setRejectionTrend).catch((e) => setError(e.message));
    fetchRegionalRigor().then(setRegionalRigor).catch((e) => console.error("regionalRigor:", e));
    fetchOverviewStats().then(setOverviewStats).catch((e) => console.error("overviewStats:", e));
    fetchOverviewTrend().then(setOverviewTrend).catch((e) => console.error("overviewTrend:", e));
    fetchOverviewInsights().then(setOverviewInsights).catch((e) => console.error("overviewInsights:", e));
  }, []);

  // Load data lazily per tab
  useEffect(() => {
    switch (activeTab) {
      case "trend": /* uses rejectionTrend, loaded at mount */ break;
      case "regional": /* uses regionalRigor, loaded at mount */ break;
      case "modalidade": lazyFetch(modalidade, setModalidade, fetchDecisionsByModalidade); break;
      case "yearly": lazyFetch(approvalRates, setApprovalRates, fetchApprovalRates); break;
      case "risco":
        lazyFetch(heatmapData, setHeatmapData, fetchActivityClassHeatmap);
        lazyFetch(infractionBands, setInfractionBands, fetchInfractionBands);
        lazyFetch(infractionsVsApproval, setInfractionsVsApproval, fetchInfractionsVsApproval);
        lazyFetch(cfemVsApproval, setCfemVsApproval, fetchCfemVsApproval);
        lazyFetch(recidivism, setRecidivism, fetchRecidivism);
        lazyFetch(shelvingData, setShelvingData, fetchShelvingAnalysis);
        break;
      case "copam": /* fetched inside its own section */ break;
    }
  }, [activeTab, lazyFetch, modalidade, approvalRates, heatmapData, infractionBands, infractionsVsApproval, cfemVsApproval, recidivism, shelvingData]);

  // Aggregate modalidade data for stacked view
  const modalidadeAgg = modalidade
    ? Object.values(
        modalidade.reduce<Record<string, Record<string, unknown>>>((acc, row) => {
          const key = String(row.modalidade);
          if (!acc[key]) acc[key] = { modalidade: key, deferido: 0, indeferido: 0, outros: 0 };
          const decisao = String(row.decisao);
          const n = Number(row.n);
          if (decisao === "deferido") acc[key].deferido = (acc[key].deferido as number) + n;
          else if (decisao === "indeferido") acc[key].indeferido = (acc[key].indeferido as number) + n;
          else acc[key].outros = (acc[key].outros as number) + n;
          return acc;
        }, {})
      )
        .sort((a, b) => {
          const totalA = (a.deferido as number) + (a.indeferido as number) + (a.outros as number);
          const totalB = (b.deferido as number) + (b.indeferido as number) + (b.outros as number);
          return totalB - totalA;
        })
        .slice(0, 10)
    : null;

  // Aggregate approval rates by year
  const yearlyRates = approvalRates
    ? Object.values(
        approvalRates.reduce<Record<number, { ano: number; total: number; deferidos: number }>>(
          (acc, row) => {
            const ano = Number(row.ano);
            if (!acc[ano]) acc[ano] = { ano, total: 0, deferidos: 0 };
            acc[ano].total += Number(row.total);
            acc[ano].deferidos += Number(row.deferidos);
            return acc;
          },
          {}
        )
      )
        .map((r) => ({ ...r, taxa: r.total > 0 ? Math.round((1000 * r.deferidos) / r.total) / 10 : 0 }))
        .sort((a, b) => a.ano - b.ano)
    : null;

  // Aggregate approval rates by class
  const classeRates = approvalRates
    ? Object.values(
        approvalRates.reduce<Record<number, { classe: number; total: number; deferidos: number }>>(
          (acc, row) => {
            const classe = Number(row.classe);
            if (!classe || classe < 1 || classe > 6) return acc;
            if (!acc[classe]) acc[classe] = { classe, total: 0, deferidos: 0 };
            acc[classe].total += Number(row.total);
            acc[classe].deferidos += Number(row.deferidos);
            return acc;
          },
          {}
        )
      )
        .map((r) => ({ ...r, taxa: r.total > 0 ? Math.round((1000 * r.deferidos) / r.total) / 10 : 0, label: `Classe ${r.classe}` }))
        .sort((a, b) => a.classe - b.classe)
    : null;

  // KPIs from rejection trend
  const latestYear = rejectionTrend?.at(-1);
  const prevYear = rejectionTrend?.at(-2);
  const trendDelta =
    latestYear && prevYear
      ? latestYear.taxa_indeferimento - prevYear.taxa_indeferimento
      : null;

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-8">

      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight lg:text-3xl">
          Análise de Decisões
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Taxas de aprovação, tendências e análise comparativa por regional e modalidade
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          Deferido = aprovado · Indeferido = negado · Arquivamento = processo encerrado sem decisão de mérito · Classes 1-6 por impacto ambiental
        </p>
      </div>

      {/* Filtered KPI summary */}
      {filteredSummary && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Decisões</p>
            <p className="text-2xl font-bold tabular-nums">{fmtNumber(filteredSummary.total)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Taxa Aprovação</p>
            <p className="text-2xl font-bold tabular-nums text-brand-teal">{fmtPct(filteredSummary.taxa_aprovacao)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deferidos</p>
            <p className="text-2xl font-bold tabular-nums text-success">{fmtNumber(filteredSummary.deferidos)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Indeferidos</p>
            <p className="text-2xl font-bold tabular-nums text-danger">{fmtNumber(filteredSummary.indeferidos)}</p>
          </div>
        </div>
      )}

      {/* Contextual insights */}
      {contextInsights && contextInsights.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {contextInsights.map((insight, i) => (
            <div
              key={i}
              className={`rounded-lg border-l-2 px-3 py-2.5 ${
                insight.tipo === "risco" ? "border-l-danger bg-danger/5" :
                insight.tipo === "tendencia" ? "border-l-brand-teal bg-brand-teal/5" :
                "border-l-brand-gold bg-brand-gold/5"
              }`}
            >
              <p className="text-xs font-semibold">{insight.titulo}</p>
              <p className="text-[11px] text-muted-foreground">{insight.descricao}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-sm text-destructive">
            Erro ao carregar dados: {error}
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      {latestYear ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            icon={BarChart3}
            label="Total Decisões (Mineração)"
            value={fmtNumber(latestYear.total)}
            subtitle={`em ${latestYear.ano}`}
          />
          <KPICard
            icon={TrendingDown}
            label="Taxa Indeferimento"
            value={fmtPct(latestYear.taxa_indeferimento)}
            subtitle={
              trendDelta !== null
                ? `${trendDelta > 0 ? "+" : ""}${trendDelta.toFixed(1)}pp vs ${prevYear!.ano}`
                : undefined
            }
            accent={latestYear.taxa_indeferimento > 20 ? "bg-danger" : undefined}
          />
          <KPICard
            icon={Activity}
            label="Arquivamentos"
            value={fmtPct(latestYear.taxa_arquivamento)}
            subtitle={`${fmtNumber(latestYear.arquivamentos)} processos`}
            accent="bg-brand-gold"
          />
          <KPICard
            icon={MapPin}
            label="Regionais"
            value={String(regionalRigor?.length ?? "—")}
            subtitle="com dados suficientes"
          />
        </div>
      ) : !error ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : null}

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="trend">Tendência Temporal</TabsTrigger>
          <TabsTrigger value="regional">Rigor Regional</TabsTrigger>
          <TabsTrigger value="modalidade">Por Modalidade</TabsTrigger>
          <TabsTrigger value="yearly">Taxa Anual</TabsTrigger>
          <TabsTrigger value="risco">Fatores de Risco</TabsTrigger>
          <TabsTrigger value="caso">Caso Detalhado</TabsTrigger>
          <TabsTrigger value="copam">Deliberações CMI</TabsTrigger>
        </TabsList>

        {/* Tab 0: Visão Geral — overview stats, trend chart, insights */}
        <TabsContent value="visao-geral" className="space-y-6">
          {overviewStats ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total Decisões"
                value={fmtNumber(overviewStats.total_decisoes)}
                subtitle="processos analisados · Fonte: SEMAD MG"
                icon={BarChart3}
              />
              <StatCard
                label="Aprovação Mineração"
                value={fmtPct(overviewStats.taxa_aprovacao_mineracao)}
                subtitle={`${fmtNumber(overviewStats.total_decisoes_mineracao)} decisões minerárias`}
                icon={TrendingDown}
                accentClass="bg-brand-teal"
              />
              <StatCard
                label="Infrações IBAMA"
                value={fmtNumber(overviewStats.total_infracoes)}
                subtitle="infrações ambientais · Fonte: IBAMA"
                icon={FileWarning}
                accentClass="bg-brand-orange"
              />
              <StatCard
                label="Processos ANM"
                value={fmtNumber(overviewStats.total_processos_anm)}
                subtitle="títulos minerários · Fonte: ANM SIGMINE"
                icon={Building2}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="flex items-start gap-4 p-5"><Skeleton className="h-10 w-10 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-24" /><Skeleton className="h-3 w-32" /></div></CardContent></Card>
              ))}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {overviewTrend ? (
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-heading">
                      <BarChart3 className="h-4 w-4 text-brand-teal" />
                      Tendência Anual de Decisões
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TrendChart data={overviewTrend} />
                  </CardContent>
                </Card>
              ) : (
                <Card><CardHeader><CardTitle>Tendência Anual</CardTitle></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
              )}
            </div>

            {overviewInsights ? (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="font-heading text-base">Insights Chave</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {overviewInsights.map((ins, i) => (
                    <InsightCard key={i} tone={ins.tone} title={ins.title} value={ins.value} detail={ins.detail} />
                  ))}
                </CardContent>
              </Card>
            ) : overviewStats ? (
              <Card className="h-full">
                <CardHeader><CardTitle className="font-heading text-base">Insights Chave</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        {/* Tab 1: Rejection trend + insights */}
        <TabsContent value="trend">
          <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <TrendingDown className="h-4 w-4 text-danger" />
                Tendência de Indeferimentos (Mineração)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rejectionTrend ? (
                <ResponsiveContainer width="100%" height={360}>
                  <AreaChart data={rejectionTrend}>
                    <defs>
                      <linearGradient id="gradIndef" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradArq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="ano" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis unit="%" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v, name) => [`${Number(v).toFixed(1)}%`, String(name)]} />
                    <Area type="monotone" dataKey="taxa_indeferimento" name="Indeferimento" stroke="var(--chart-3)" fill="url(#gradIndef)" strokeWidth={2} />
                    <Area type="monotone" dataKey="taxa_arquivamento" name="Arquivamento" stroke="var(--chart-5)" fill="url(#gradArq)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-[360px] w-full" />
              )}
            </CardContent>
          </Card>

          {/* Insights sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestYear && (
                <>
                  <InsightItem
                    tone={latestYear.taxa_indeferimento > 20 ? "negative" : "positive"}
                    text={`Indeferimento ${latestYear.ano}: ${fmtPct(latestYear.taxa_indeferimento)}`}
                  />
                  <InsightItem
                    tone="neutral"
                    text={`Arquivamentos: ${fmtPct(latestYear.taxa_arquivamento)} (${fmtNumber(latestYear.arquivamentos)} processos)`}
                  />
                </>
              )}
              {regionalRigor && regionalRigor.length > 0 && (
                <InsightItem
                  tone="negative"
                  text={`Regional mais rigorosa: ${regionalRigor.reduce((a, b) => a.taxa_indeferimento > b.taxa_indeferimento ? a : b).regional.replace("Unidade Regional de Regularização Ambiental ", "")}`}
                />
              )}
              {infractionBands && infractionBands.length > 0 && (
                <InsightItem
                  tone="neutral"
                  text={`${infractionBands.filter(b => b.faixa_infracoes.includes("6+")).reduce((a, b) => a + b.total, 0)} empresas com 6+ infrações`}
                />
              )}
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Regional rigor */}
        <TabsContent value="regional">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <MapPin className="h-4 w-4 text-brand-teal" />
                Rigor por Regional SEMAD
              </CardTitle>
            </CardHeader>
            <CardContent>
              {regionalRigor ? (
                <ResponsiveContainer width="100%" height={Math.max(360, regionalRigor.length * 36)}>
                  <BarChart data={regionalRigor} layout="vertical" margin={{ left: 140 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" unit="%" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis
                      type="category"
                      dataKey="regional"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      width={130}
                    />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(1)}%`]} />
                    <ReferenceLine
                      x={Math.round(regionalRigor.reduce((s, r) => s + r.taxa_indeferimento, 0) / regionalRigor.length * 10) / 10}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Média`,
                        position: "top",
                        fontSize: 10,
                        fill: "var(--muted-foreground)",
                      }}
                    />
                    <Bar dataKey="taxa_indeferimento" name="Taxa Indeferimento" radius={[0, 4, 4, 0]}>
                      {regionalRigor.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.taxa_indeferimento > 30
                              ? "var(--danger)"
                              : entry.taxa_indeferimento > 15
                              ? "var(--warning)"
                              : "var(--success)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-[360px] w-full" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Modalidade */}
        <TabsContent value="modalidade">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <BarChart3 className="h-4 w-4 text-brand-orange" />
                Decisões por Modalidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {modalidadeAgg ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={modalidadeAgg} layout="vertical" margin={{ left: 160 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis
                      type="category"
                      dataKey="modalidade"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      width={150}
                    />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="deferido" name="Deferido" stackId="a" fill="var(--success)" />
                    <Bar dataKey="indeferido" name="Indeferido" stackId="a" fill="var(--danger)" />
                    <Bar dataKey="outros" name="Outros" stackId="a" fill="var(--muted)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-[400px] w-full" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Yearly approval + by class */}
        <TabsContent value="yearly">
          <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading">
                <Activity className="h-4 w-4 text-brand-teal" />
                Taxa de Aprovação Anual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {yearlyRates ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={yearlyRates}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="ano" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v, name) => [name === "Taxa Aprovação" ? `${Number(v).toFixed(1)}%` : fmtNumber(Number(v)), String(name)]} />
                    <ReferenceLine
                      y={Math.round(yearlyRates.reduce((s, r) => s + r.taxa, 0) / yearlyRates.length * 10) / 10}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Média",
                        position: "right",
                        fontSize: 10,
                        fill: "var(--muted-foreground)",
                      }}
                    />
                    <Bar dataKey="taxa" name="Taxa Aprovação" radius={[4, 4, 0, 0]}>
                      {yearlyRates.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.taxa >= 70 ? "var(--success)" : entry.taxa >= 50 ? "var(--warning)" : "var(--danger)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-[360px] w-full" />
              )}
            </CardContent>
          </Card>

          {/* Approval by class */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <BarChart3 className="h-4 w-4 text-brand-orange" />
                Por Classe de Impacto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classeRates ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={classeRates} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={70} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(1)}%`]} />
                    <Bar dataKey="taxa" name="Aprovação" radius={[0, 4, 4, 0]}>
                      {classeRates.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.taxa >= 70 ? "var(--success)" : entry.taxa >= 50 ? "var(--warning)" : "var(--danger)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-[360px] w-full" />
              )}
              <p className="mt-2 text-[10px] text-muted-foreground/60">
                Classe 1 = menor impacto · Classe 6 = maior impacto (DN COPAM 217/2017)
              </p>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* Tab 5: Risk Factors */}
        <TabsContent value="risco">
          <div className="space-y-6">
            {/* Row 1: Heatmap Atividade × Classe */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-sm">
                  <Activity className="h-4 w-4 text-brand-teal" />
                  Taxa de Aprovação: Atividade × Classe
                </CardTitle>
                <p className="text-xs text-muted-foreground">Classe 1 = menor impacto · Classe 6 = maior impacto</p>
              </CardHeader>
              <CardContent>
                {heatmapData ? <HeatmapGrid data={heatmapData} /> : <Skeleton className="h-[300px] w-full" />}
              </CardContent>
            </Card>

            {/* Row 2: Infractions + Scatter */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-sm">
                    <FileWarning className="h-4 w-4 text-danger" />
                    Infrações IBAMA vs. Aprovação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {infractionBands ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={infractionBands}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="faixa_infracoes" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                        <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(1)}%`]} />
                        <Bar dataKey="taxa_aprovacao" name="Taxa Aprovação" radius={[4, 4, 0, 0]}>
                          {infractionBands.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.taxa_aprovacao >= 70 ? "var(--success)" : entry.taxa_aprovacao >= 50 ? "var(--warning)" : "var(--danger)"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Skeleton className="h-[300px] w-full" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-sm">
                    <Activity className="h-4 w-4 text-brand-orange" />
                    Dispersão: Infrações × Aprovação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {infractionsVsApproval ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" dataKey="total_infracoes" name="Infrações" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} label={{ value: "Infrações", position: "bottom", fontSize: 11 }} />
                        <YAxis type="number" dataKey="taxa_aprovacao" name="Aprovação" unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                        <ZAxis type="number" dataKey="total_decisoes" range={[20, 400]} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v, name) => [name === "Aprovação" ? `${Number(v).toFixed(1)}%` : String(v), String(name)]} />
                        <Scatter data={infractionsVsApproval} fill="var(--brand-orange)" fillOpacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <Skeleton className="h-[300px] w-full" />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Row 3: CFEM profile + Reincidência */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-sm">
                    <BarChart3 className="h-4 w-4 text-brand-gold" />
                    Perfil CFEM vs. Aprovação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cfemVsApproval ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {cfemVsApproval.map((row) => {
                        const tone = row.taxa_aprovacao >= 70 ? "success" : row.taxa_aprovacao >= 50 ? "warning" : "danger";
                        return (
                          <div key={row.perfil_empresa} className={`rounded-lg border-l-4 p-4 ${tone === "success" ? "border-l-success bg-success/5" : tone === "warning" ? "border-l-warning bg-warning/5" : "border-l-danger bg-danger/5"}`}>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.perfil_empresa}</p>
                            <p className="text-2xl font-bold">{row.taxa_aprovacao}%</p>
                            <p className="text-xs text-muted-foreground">{fmtNumber(row.total_decisoes)} decisões · {fmtNumber(row.deferidos)} deferidos</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Skeleton className="h-[160px] w-full" />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-sm">
                    <Building2 className="h-4 w-4 text-brand-teal" />
                    Reincidência: Decisões por Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recidivism ? (
                    <div className="grid gap-3">
                      {recidivism.map((row) => {
                        const tone = row.taxa_media_aprovacao >= 70 ? "success" : row.taxa_media_aprovacao >= 50 ? "warning" : "danger";
                        return (
                          <div key={row.faixa} className={`rounded-lg border-l-4 p-3 ${tone === "success" ? "border-l-success bg-success/5" : tone === "warning" ? "border-l-warning bg-warning/5" : "border-l-danger bg-danger/5"}`}>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{row.faixa}</p>
                              <p className="text-lg font-bold">{row.taxa_media_aprovacao}%</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{fmtNumber(row.empresas)} empresas · {fmtNumber(row.total_decisoes_grupo)} decisões</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Skeleton className="h-[160px] w-full" />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Row 4: Arquivamento top combos */}
            {shelvingData && shelvingData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-heading text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Top Combinações por Arquivamento
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Classe × Atividade com maior taxa de arquivamento (N ≥ 10)</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, shelvingData.slice(0, 10).length * 36)}>
                    <BarChart data={shelvingData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <YAxis
                        type="category"
                        dataKey={(row: ShelvingAnalysis) => `C${row.classe} · ${row.atividade_grupo}`}
                        width={120}
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(1)}%`, "Arquivamento"]} />
                      <Bar dataKey="taxa_arquivamento" radius={[0, 4, 4, 0]} fill="var(--muted-foreground)" fillOpacity={0.5} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab 6: Caso Detalhado */}
        <TabsContent value="caso">
          <CasoDetalhadoTab />
        </TabsContent>

        {/* Tab 7: Deliberações CMI */}
        <TabsContent value="copam">
          <DeliberacoesCMITab />
        </TabsContent>
      </Tabs>

      {/* Regional detail table */}
      {regionalRigor && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Detalhamento Regional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Regional</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                    <th className="pb-2 text-right font-medium">Deferidos</th>
                    <th className="pb-2 text-right font-medium">Indeferidos</th>
                    <th className="pb-2 text-right font-medium">Aprovação</th>
                    <th className="pb-2 text-right font-medium">Indeferimento</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalRigor.map((r) => (
                    <tr key={r.regional} className="border-b border-border/50">
                      <td className="py-2 font-medium">
                        <Link
                          href={`/explorar?dataset=mg_semad&search=${encodeURIComponent(r.regional)}`}
                          className="inline-flex items-center gap-1 hover:text-brand-teal transition-colors"
                          title="Ver decisões no Explorador"
                        >
                          {r.regional}
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="py-2 text-right font-tabular">{fmtNumber(r.total)}</td>
                      <td className="py-2 text-right font-tabular">{fmtNumber(r.deferidos)}</td>
                      <td className="py-2 text-right font-tabular">{fmtNumber(r.indeferidos)}</td>
                      <td className="py-2 text-right">
                        <Badge variant={r.taxa_aprovacao >= 70 ? "default" : r.taxa_aprovacao >= 50 ? "secondary" : "destructive"}>
                          {fmtPct(r.taxa_aprovacao)}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        <Badge variant={r.taxa_indeferimento > 30 ? "destructive" : r.taxa_indeferimento > 15 ? "secondary" : "outline"}>
                          {fmtPct(r.taxa_indeferimento)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTAs estratégicos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4">
        <Link href="/due-diligence">
          <Card className="group border-brand-teal/20 hover:border-brand-teal/50 transition-all hover:shadow-md h-full">
            <CardContent className="p-5">
              <p className="text-sm font-semibold group-hover:text-brand-teal">Análise de Conformidade</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Avalie a aderência do seu processo antes de protocolar no órgão ambiental.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-teal">
                Due Diligence <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>
        <Card className="border-brand-gold/20 opacity-70">
          <CardContent className="p-5">
            <p className="text-sm font-semibold">Análise de Viabilidade</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Score de viabilidade com base em localização, atividade e histórico regional.
            </p>
            <Badge variant="outline" className="mt-3 text-[10px]">Em breve</Badge>
          </CardContent>
        </Card>
        <a href="https://summoquartile.com" target="_blank" rel="noopener noreferrer">
          <Card className="group border-brand-orange/20 hover:border-brand-orange/50 transition-all hover:shadow-md h-full">
            <CardContent className="p-5">
              <p className="text-sm font-semibold group-hover:text-brand-orange">Consultoria Especializada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Precisa de apoio para estruturar seu processo? Fale com nosso time.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-orange">
                Fale conosco <ExternalLink className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* Link para BI da FEAM */}
      <p className="text-center text-xs text-muted-foreground/50">
        Dados oficiais:{" "}
        <a
          href="https://app.powerbi.com/view?r=eyJrIjoiYjBiMTY4ZDctNjgyOC00MmU5LWJhMjgtNmVlOGRmYTQ3ZjI2IiwidCI6IjkyNGY5ODQ3LTI0MmUtNGE5YS04OTEzLTllNDM2NDliOWVhYSJ9"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-teal hover:underline"
        >
          BI da FEAM — Licenciamento Ambiental MG
        </a>
      </p>

      </div>

      {/* Filter sidebar */}
      <FilterSidebar filters={filters} onChange={setFilters} />
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Tab 6: Caso Detalhado — CNPJ company deep dive
   ───────────────────────────────────────────────── */

function CasoDetalhadoTab() {
  const [topEmpresas, setTopEmpresas] = useState<TopEmpresa[] | null>(null);
  const [selectedCnpj, setSelectedCnpj] = useState("");
  const [cnpjInput, setCnpjInput] = useState("");
  const [profile, setProfile] = useState<EmpresaProfile | null>(null);
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopEmpresas()
      .then(setTopEmpresas)
      .catch(() => {});
  }, []);

  const loadCaso = useCallback((cnpj: string) => {
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return;
    setSelectedCnpj(clean);
    setLoading(true);
    setError(null);
    Promise.all([fetchEmpresa(clean), fetchEmpresaDecisions(clean)])
      .then(([p, d]) => {
        setProfile(p);
        setDecisions(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectChange = (v: string) => {
    if (v === "none") return;
    setCnpjInput("");
    loadCaso(v);
  };

  const handleManualSearch = () => {
    if (cnpjInput.replace(/\D/g, "").length === 14) {
      loadCaso(cnpjInput);
    }
  };

  const porteLabel: Record<string, string> = {
    MEI: "MEI",
    ME: "Microempresa",
    EPP: "Pequeno Porte",
    DEMAIS: "Médio/Grande Porte",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Building2 className="h-4 w-4 text-brand-orange" />
            Buscar Caso por CNPJ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Selecione uma empresa do ranking ou digite um CNPJ para ver infrações, CFEM e histórico de decisões.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Top 50 empresas por volume
              </label>
              {topEmpresas ? (
                <Select
                  value={selectedCnpj || "none"}
                  onValueChange={handleSelectChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione uma empresa...</SelectItem>
                    {topEmpresas.map((e) => (
                      <SelectItem key={e.cnpj_cpf} value={e.cnpj_cpf}>
                        {e.empreendimento?.slice(0, 40)} ({fmtCNPJ(e.cnpj_cpf)}) — {e.n} decisões
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
            </div>

            <div className="flex items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Ou digite um CNPJ
                </label>
                <Input
                  className="w-[180px] font-mono"
                  placeholder="00000000000000"
                  maxLength={18}
                  value={cnpjInput}
                  onChange={(e) => setCnpjInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                />
              </div>
              <Button onClick={handleManualSearch} size="default">
                <Search className="mr-1.5 h-3.5 w-3.5" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="p-4 text-sm text-destructive">
            Erro: {error}
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {profile && !loading && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Company profile card */}
          <Card className="border-l-2 border-l-brand-orange">
            <CardContent className="p-5 space-y-4">
              <div>
                <h3 className="font-heading text-lg font-bold">
                  {profile.profile?.razao_social ?? "—"}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  CNPJ {fmtCNPJ(profile.cnpj)}
                </p>
                {profile.profile?.cnae_descricao && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile.profile.cnae_descricao}
                  </p>
                )}
              </div>

              {profile.profile && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniKPI
                    label="Porte"
                    value={porteLabel[profile.profile.porte?.trim().toUpperCase()] ?? profile.profile.porte ?? "—"}
                  />
                  <MiniKPI
                    label="Abertura"
                    value={profile.profile.data_abertura ? fmtDate(profile.profile.data_abertura) : "—"}
                  />
                  <MiniKPI
                    label="Situação"
                    value={profile.profile.situacao ?? "—"}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cross-reference KPIs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <InsightItem
              tone={profile.infracoes.total_infracoes === 0 ? "positive" : profile.infracoes.total_infracoes >= 3 ? "negative" : "neutral"}
              text={`Infrações IBAMA: ${profile.infracoes.total_infracoes === 0 ? "Nenhuma" : `${profile.infracoes.total_infracoes} infração(ões) em ${profile.infracoes.anos_com_infracao} ano(s)`}`}
            />
            <InsightItem
              tone={profile.cfem.meses_pagamento > 0 ? "positive" : "neutral"}
              text={`CFEM: ${profile.cfem.total_pago > 0 ? fmtReais(profile.cfem.total_pago) : "Sem pagamentos"} — ${profile.cfem.meses_pagamento} mês(es)`}
            />
          </div>

          {/* Decision history */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <FileText className="h-4 w-4 text-brand-teal" />
                Histórico de Decisões
                {decisions && (
                  <Badge variant="secondary" className="ml-2">
                    {decisions.length} decisão(ões)
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {decisions && decisions.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {decisions.map((d, i) => {
                    const empreendimento = String(d.empreendimento ?? d.atividade ?? "—");
                    const regional = d.regional ? String(d.regional) : null;
                    const ano = d.ano ? String(d.ano) : "";
                    const meta = [
                      d.classe ? `Classe ${d.classe}` : null,
                      d.modalidade,
                      d.data_decisao ? fmtDate(d.data_decisao) : ano,
                      regional,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border/50 p-3"
                      >
                        <span className="mt-0.5 text-muted-foreground/50">📄</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {empreendimento}
                          </p>
                          <p className="text-xs text-muted-foreground">{meta}</p>
                          {d.atividade && (
                            <p className="mt-0.5 text-xs text-muted-foreground/60 truncate">
                              {d.atividade}
                            </p>
                          )}
                        </div>
                        <DecisionBadge decisao={d.decisao} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma decisão de mineração encontrada para este CNPJ.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Tab 7: Deliberações CMI (COPAM)
   ───────────────────────────────────────────────── */

function DeliberacoesCMITab() {
  const [data, setData] = useState<CopamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMeeting, setExpandedMeeting] = useState<number | null>(null);

  useEffect(() => {
    fetchCopamMeetings()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-5"><Skeleton className="h-[400px] w-full" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-4 text-sm text-destructive">
          Dados COPAM não carregados: {error}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Dados COPAM não disponíveis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Reuniões da CMI (COPAM) onde projetos de mineração são deliberados.
        Cada reunião contém pareceres técnicos e atas com decisões do colegiado.
      </p>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard
          icon={FileText}
          label="Reuniões CMI"
          value={fmtNumber(data.stats.total_reunioes)}
          subtitle="registradas"
        />
        <KPICard
          icon={FileWarning}
          label="Documentos"
          value={fmtNumber(data.stats.total_documentos)}
          subtitle="pareceres e atas"
        />
        <KPICard
          icon={Activity}
          label="Última Reunião"
          value={data.stats.ultima_reuniao ? fmtDate(data.stats.ultima_reuniao) : "—"}
          subtitle="CMI/COPAM"
        />
      </div>

      {/* Meetings table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <FileText className="h-4 w-4 text-brand-teal" />
            Reuniões
            <Badge variant="secondary" className="ml-2">{data.total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Reunião</th>
                  <th className="pb-2 text-right font-medium">Documentos</th>
                  <th className="pb-2 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((meeting, i) => {
                  const docs = parseDocumentLinks(meeting.documents_str);
                  const isExpanded = expandedMeeting === i;
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/50 cursor-pointer hover:bg-muted/30"
                      onClick={() => setExpandedMeeting(isExpanded ? null : i)}
                    >
                      <td className="py-2 font-mono text-xs whitespace-nowrap">
                        {fmtDate(meeting.data)}
                      </td>
                      <td className="py-2">
                        <p className="font-medium">{meeting.titulo}</p>
                        {isExpanded && docs.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 animate-in fade-in duration-200">
                            {docs.map((doc, j) => (
                              <a
                                key={j}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-brand-teal hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {doc.name.slice(0, 50)}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right font-tabular">
                        {meeting.total_documents}
                      </td>
                      <td className="py-2 text-center">
                        {docs.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[10px] text-muted-foreground/50">
            Fonte: COPAM CMI · sistemas.meioambiente.mg.gov.br
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** Parse pipe-delimited document string: "name1.pdf|url1;name2.pdf|url2" */
function parseDocumentLinks(str: string | null): { name: string; url: string }[] {
  if (!str) return [];
  return str
    .split(";")
    .map((entry) => {
      const parts = entry.trim().split("|", 2);
      if (parts.length === 2 && parts[1]?.startsWith("http")) {
        return { name: parts[0].trim(), url: parts[1].trim() };
      }
      return null;
    })
    .filter((x): x is { name: string; url: string } => x !== null);
}

function DecisionBadge({ decisao }: { decisao: string }) {
  const d = decisao?.toLowerCase() ?? "";
  const variant = d.startsWith("def")
    ? "default"
    : d.startsWith("ind")
      ? "destructive"
      : "secondary";
  return (
    <Badge variant={variant} className="shrink-0 text-[10px]">
      {decisao}
    </Badge>
  );
}

function MiniKPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      {accent && <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />}
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold font-heading font-tabular leading-none">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightItem({ tone, text }: { tone: "positive" | "neutral" | "negative"; text: string }) {
  const toneClasses = {
    positive: "border-l-success bg-success/5",
    neutral: "border-l-muted-foreground bg-muted/30",
    negative: "border-l-danger bg-danger/5",
  };
  return (
    <div className={`rounded-r-md border-l-2 px-3 py-2 text-xs ${toneClasses[tone]}`}>
      {text}
    </div>
  );
}

/* ── Heatmap (Atividade × Classe) ── */
function HeatmapGrid({ data }: { data: ActivityClassHeatmap[] }) {
  // Build matrix: rows = atividade codes, cols = classes 1-6
  const atividades = [...new Set(data.map((d) => d.atividade_code))].sort();
  const classes = [1, 2, 3, 4, 5, 6];

  const lookup = new Map<string, ActivityClassHeatmap>();
  for (const d of data) lookup.set(`${d.atividade_code}|${d.classe}`, d);

  const rateColor = (rate: number | null) => {
    if (rate == null) return "bg-muted/30";
    if (rate >= 80) return "bg-success/70 text-success-foreground";
    if (rate >= 65) return "bg-success/30";
    if (rate >= 50) return "bg-warning/40";
    if (rate >= 30) return "bg-danger/30";
    return "bg-danger/60 text-white";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="py-2 pr-3 text-left font-medium text-muted-foreground">Atividade</th>
            {classes.map((c) => (
              <th key={c} className="px-2 py-2 text-center font-medium text-muted-foreground w-16">
                Classe {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {atividades.map((atv) => (
            <tr key={atv} className="border-t border-border/50">
              <td className="py-1.5 pr-3 font-mono text-muted-foreground">{atv}</td>
              {classes.map((c) => {
                const cell = lookup.get(`${atv}|${c}`);
                return (
                  <td key={c} className="px-1 py-1.5 text-center">
                    {cell ? (
                      <span
                        className={`inline-block w-full rounded px-1.5 py-1 tabular-nums ${rateColor(cell.taxa_aprovacao)}`}
                        title={`${cell.taxa_aprovacao}% · N=${cell.total}`}
                      >
                        {cell.taxa_aprovacao}%
                        <span className="block text-[9px] opacity-60">N={cell.total}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightCard({ tone, title, value, detail }: {
  tone: "positive" | "neutral" | "negative";
  title?: string;
  value?: string;
  detail?: string;
}) {
  const toneClasses = {
    positive: "border-l-success bg-success/5",
    neutral: "border-l-muted-foreground bg-muted/30",
    negative: "border-l-danger bg-danger/5",
  };

  return (
    <div className={`rounded-r-md border-l-2 px-3 py-2.5 ${toneClasses[tone]}`}>
      {title && <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>}
      {value && <p className="text-sm font-semibold">{value}</p>}
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
