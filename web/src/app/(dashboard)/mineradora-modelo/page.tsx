"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Factory,
  Target,
  Pickaxe,
  Truck,
  Cog,
  Droplets,
  Wrench,
  Package,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  fetchSimSetores,
  fetchSimSetor,
  type SimSetoresResponse,
  type SimSetorResponse,
  type SimKPI,
} from "@/lib/api";
import { fmtBR } from "@/lib/format";

import { MODULES, MODULE_MAP } from "./lib/data/modules-index";
import type { MiningModule, AIProjection } from "./lib/types";
import { OverviewSection } from "./components/overview-section";
import { ModuleSectionNav, type SectionId } from "./components/module-section-nav";
import { ActivityMap } from "./components/activity-map";
import { AIUseCases } from "./components/ai-use-cases";
import { MaturityAssessment } from "./components/maturity-assessment";
import { ImplementationRoadmap } from "./components/implementation-roadmap";
import { CTAModal } from "./components/cta-modal";

const CHART_TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: 12,
};

const MODULE_ICONS: Record<string, typeof Target> = {
  planejamento: Target,
  operacao: Truck,
  processamento: Cog,
  rejeitos: Droplets,
  manutencao: Wrench,
  logistica: Package,
  ssma: ShieldCheck,
};

// KPIs where lower is better — delta color inverted
const INVERTED_DELTA = new Set([
  "Ciclo de Transporte",
  "Consumo de Diesel",
  "MTTR",
  "Custo por Tonelada",
  "Lead Time Médio",
  "Demurrage",
  "TRIFR",
  "Volume Disposto",
  "REM (Relação Estéril/Minério)",
]);

export default function MineradoraModeloPage() {
  return (
    <Suspense>
      <MineradoraContent />
    </Suspense>
  );
}

function MineradoraContent() {
  const params = useSearchParams();

  // Active module tab
  const [activeModule, setActiveModule] = useState<string>(
    params.get("modulo") || MODULES[0].key
  );
  // Active section within module
  const [activeSection, setActiveSection] = useState<SectionId>("kpis");
  // CTA modal
  const [ctaOpen, setCtaOpen] = useState(false);

  // API data for KPIs
  const [setores, setSetores] = useState<SimSetoresResponse | null>(null);
  const [setorData, setSetorData] = useState<SimSetorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [setorLoading, setSetorLoading] = useState(false);

  // Section refs for scroll
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    kpis: null,
    atividades: null,
    ia: null,
    maturidade: null,
    roadmap: null,
  });

  // Load setores list
  useEffect(() => {
    fetchSimSetores()
      .then(setSetores)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Map module key -> setor display name
  const getSetorName = useCallback(
    (moduleKey: string) => {
      if (!setores) return "";
      const mod = MODULE_MAP[moduleKey];
      if (!mod) return "";
      const keys = Object.keys(setores.setores);
      return keys.find((k) => k.toLowerCase().includes(moduleKey.slice(0, 5))) || mod.nome;
    },
    [setores]
  );

  // Load setor data when active module changes
  useEffect(() => {
    if (!setores) return;
    const setorName = getSetorName(activeModule);
    if (!setorName) return;
    setSetorLoading(true);
    fetchSimSetor(setorName)
      .then(setSetorData)
      .catch(() => {})
      .finally(() => setSetorLoading(false));
  }, [activeModule, setores, getSetorName]);

  // URL sync
  useEffect(() => {
    const qs = new URLSearchParams();
    if (activeModule !== MODULES[0].key) qs.set("modulo", activeModule);
    const q = qs.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${q ? `?${q}` : ""}`
    );
  }, [activeModule]);

  // Scroll to section
  function handleSectionChange(section: SectionId) {
    setActiveSection(section);
    sectionRefs.current[section]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleModuleChange(key: string) {
    setActiveModule(key);
    setActiveSection("kpis");
  }

  const currentModule = MODULE_MAP[activeModule];
  const kpis = setorData?.kpis ?? [];

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Warning banner */}
      <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
        <p className="text-sm">
          <span className="font-semibold">Dados 100% simulados</span>
          {" "}— operação fictícia de 5.0 MTPA de minério de ferro para demonstração de IA aplicada à mineração.
        </p>
      </div>

      {/* Overview section */}
      <OverviewSection onModuleClick={handleModuleChange} />

      {/* Module tabs */}
      <Tabs value={activeModule} onValueChange={handleModuleChange}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-auto gap-1 w-max">
            {MODULES.map((mod) => {
              const Icon = MODULE_ICONS[mod.key] || Pickaxe;
              return (
                <TabsTrigger
                  key={mod.key}
                  value={mod.key}
                  className="gap-1.5 text-xs whitespace-nowrap"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {mod.nome}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {MODULES.map((mod) => (
          <TabsContent key={mod.key} value={mod.key} className="mt-4 space-y-0">
            {currentModule && mod.key === activeModule && (
              <ModuleContent
                mod={currentModule}
                kpis={kpis}
                kpisLoading={loading || setorLoading}
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                sectionRefs={sectionRefs}
                onRequestDiagnostico={() => setCtaOpen(true)}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Model parameters footer */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 text-xs text-muted-foreground sm:grid-cols-3">
            <div>
              <p className="font-medium text-foreground">Produção</p>
              <p>5.0 MTPA Fe · ROM ~45% Fe · Concentrado ~65% Fe</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Método</p>
              <p>Disposição em pilha seca · Recuperação 85% · Disponibilidade 88%</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Simulação</p>
              <p>24 meses · 7 módulos · Seed fixa (determinístico)</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground/60">
            Todos os dados são fictícios, gerados com base em benchmarks da indústria para fins de demonstração comercial.
          </p>
        </CardContent>
      </Card>

      {/* CTA Modal */}
      <CTAModal
        open={ctaOpen}
        onOpenChange={setCtaOpen}
        moduloInteresse={currentModule?.nome}
      />
    </div>
  );
}

/* ─── Module content (per-tab) ─── */

interface ModuleContentProps {
  mod: MiningModule;
  kpis: SimKPI[];
  kpisLoading: boolean;
  activeSection: SectionId;
  onSectionChange: (s: SectionId) => void;
  sectionRefs: React.MutableRefObject<Record<SectionId, HTMLDivElement | null>>;
  onRequestDiagnostico: () => void;
}

function ModuleContent({
  mod,
  kpis,
  kpisLoading,
  activeSection,
  onSectionChange,
  sectionRefs,
  onRequestDiagnostico,
}: ModuleContentProps) {
  return (
    <div className="space-y-6">
      {/* Module description */}
      <p className="text-sm text-muted-foreground">{mod.descricao}</p>

      {/* Section navigation */}
      <ModuleSectionNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      {/* §1 KPIs */}
      <div ref={(el) => { sectionRefs.current.kpis = el; }}>
        <SectionHeader title="Indicadores-Chave" icon="📊" />
        {kpisLoading ? (
          <KPISkeleton />
        ) : kpis.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {kpis.map((kpi) => (
                <KPICard
                  key={kpi.nome}
                  kpi={kpi}
                  projection={mod.projecoesIA.find(
                    (p) => p.kpiNome === kpi.nome
                  )}
                  accentColor={mod.cor}
                />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {kpis.map((kpi) => (
                <KPIChart key={kpi.nome} kpi={kpi} accentColor={mod.cor} />
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              KPIs disponíveis quando a API do simulador estiver ativa.
            </CardContent>
          </Card>
        )}
      </div>

      {/* §2 Atividades */}
      <div ref={(el) => { sectionRefs.current.atividades = el; }}>
        <SectionHeader title="Atividades & Gargalos" icon="⚙️" />
        <ActivityMap atividades={mod.atividades} accentColor={mod.cor} />
      </div>

      {/* §3 IA */}
      <div ref={(el) => { sectionRefs.current.ia = el; }}>
        <SectionHeader title="Casos de Uso de IA" icon="🤖" />
        <AIUseCases casos={mod.casosIA} />
      </div>

      {/* §4 Maturidade */}
      <div ref={(el) => { sectionRefs.current.maturidade = el; }}>
        <SectionHeader title="Avaliação de Maturidade Digital" icon="📈" />
        <MaturityAssessment
          nivelAtual={mod.maturidade.nivelAtual}
          niveis={mod.maturidade.niveis}
          accentColor={mod.cor}
        />
      </div>

      {/* §5 Roadmap */}
      <div ref={(el) => { sectionRefs.current.roadmap = el; }}>
        <SectionHeader title="Roadmap de Implementação" icon="🗺️" />
        <ImplementationRoadmap
          fases={mod.roadmap}
          accentColor={mod.cor}
          onRequestDiagnostico={onRequestDiagnostico}
        />
      </div>
    </div>
  );
}

/* ─── Section header ─── */

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold">
      <span>{icon}</span>
      {title}
    </h3>
  );
}

/* ─── Page header ─── */

function PageHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-teal">
        <Factory className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight lg:text-3xl">
          Mineradora Modelo · Régua de Excelência
        </h1>
        <p className="text-xs text-muted-foreground">
          O padrão de classe mundial por área da mina — base do diagnóstico SQ Consultoria
        </p>
      </div>
    </div>
  );
}

/* ─── KPI Card (enhanced with AI projection) ─── */

function KPICard({
  kpi,
  projection,
  accentColor,
}: {
  kpi: SimKPI;
  projection?: AIProjection;
  accentColor: string;
}) {
  const isPositive = kpi.delta >= 0;
  const inverted = INVERTED_DELTA.has(kpi.nome);
  const isGood = inverted ? !isPositive : isPositive;
  const DeltaIcon = isPositive ? ArrowUp : ArrowDown;
  const deltaColor = isGood ? "text-success" : "text-danger";
  const pct = Math.min(100, Math.max(0, (kpi.current / kpi.target) * 100));

  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accentColor }}
      />
      <CardContent className="p-4 pl-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {kpi.nome}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="font-heading text-2xl font-bold tabular-nums">
            {fmtBR(kpi.current, kpi.unidade === "%" ? 1 : 2)}
          </p>
          <span className="text-xs text-muted-foreground">{kpi.unidade}</span>
        </div>
        <div className={`mt-1 flex items-center gap-1 text-xs ${deltaColor}`}>
          <DeltaIcon className="h-3 w-3" />
          {isPositive ? "+" : ""}
          {fmtBR(kpi.delta, 2)} vs. mês anterior
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
          <span className="text-[10px] font-tabular text-muted-foreground">
            {fmtBR(pct, 0)}%
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          Meta: {fmtBR(kpi.target, 1)} | Mín: {fmtBR(kpi.min_val, 1)} | Máx:{" "}
          {fmtBR(kpi.max_val, 1)}
        </p>

        {/* AI projection badge */}
        {projection && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-brand-teal/5 px-2 py-1">
            <Sparkles className="h-3 w-3 text-brand-teal" />
            <span className="text-[10px] font-semibold text-brand-teal">
              {projection.melhoriaEstimada}
            </span>
            <span className="text-[10px] text-brand-teal/70">
              {projection.descricao}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── KPI Chart ─── */

function KPIChart({
  kpi,
  accentColor,
}: {
  kpi: SimKPI;
  accentColor: string;
}) {
  const chartData = kpi.series.data.map((d, i) => ({
    month: d.slice(0, 7),
    valor: kpi.series.valor[i],
  }));

  const gradientId = `grad-${kpi.nome.replace(/\s+/g, "-")}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {kpi.nome} ({kpi.unidade})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <ReferenceArea
              y1={kpi.min_val}
              y2={kpi.max_val}
              fill="rgba(196,91,82,0.06)"
              stroke="rgba(196,91,82,0.2)"
              strokeDasharray="3 3"
            />
            <ReferenceLine
              y={kpi.target}
              stroke="var(--brand-orange)"
              strokeDasharray="4 4"
              label={{
                value: `Meta: ${kpi.target}`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--brand-orange)",
              }}
            />
            <Area
              type="monotone"
              dataKey="valor"
              stroke={accentColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              name="Realizado"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/* ─── Skeletons ─── */

function KPISkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-8 w-20" />
            <Skeleton className="mt-1 h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
