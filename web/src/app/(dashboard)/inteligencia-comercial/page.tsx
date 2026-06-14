"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Globe,
  DollarSign,
  Coins,
  MapPin,
  Trophy,
  Crown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiStrip } from "./kpi-strip";
import { MercadoTab } from "./tab-mercado";
import { ProducaoTab } from "./tab-producao";
import { TerritorioTab } from "./tab-territorio";
import { RankingTab } from "./tab-ranking";
import { PremiumTab } from "./tab-premium";
import { ProdutosTab } from "./tab-produtos";
import { PRESETS_BY_TAB } from "./chart-helpers";

const TAB_ICONS = {
  mercado: DollarSign,
  ranking: Trophy,
  producao: Coins,
  territorio: MapPin,
  produtos: Sparkles,
  premium: Crown,
} as const;

const TAB_LABELS = {
  mercado: "Mercado",
  ranking: "Ranking",
  producao: "Produção & Receita",
  territorio: "Território",
  produtos: "Produtos",
  premium: "Premium",
} as const;

type TabKey = keyof typeof TAB_LABELS;
// Sub-abas dentro de "Dados de Mercado" (Produtos e Premium foram para "Inteligência Summo")
const DATA_TAB_KEYS: TabKey[] = ["mercado", "ranking", "producao", "territorio"];

export default function InteligenciaComercialPage() {
  return (
    <Suspense>
      <InteligenciaContent />
    </Suspense>
  );
}

function InteligenciaContent() {
  const params = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(
    (params.get("tab") as TabKey) || "mercado",
  );
  const [activeMetric, setActiveMetric] = useState<string>(
    params.get("metric") || PRESETS_BY_TAB.mercado[0].id,
  );
  const [macro, setMacro] = useState<"dados" | "inteligencia">(
    params.get("v") === "inteligencia" || params.get("tab") === "produtos" ? "inteligencia" : "dados",
  );

  function handleTabChange(tab: string) {
    const t = tab as TabKey;
    setActiveTab(t);
    const firstPreset = PRESETS_BY_TAB[t as keyof typeof PRESETS_BY_TAB]?.[0]?.id;
    if (firstPreset) setActiveMetric(firstPreset);
  }

  useEffect(() => {
    const qs = new URLSearchParams();
    if (activeTab !== "mercado") qs.set("tab", activeTab);
    const presets = PRESETS_BY_TAB[activeTab as keyof typeof PRESETS_BY_TAB];
    const defaultMetric = presets?.[0]?.id;
    if (defaultMetric && activeMetric !== defaultMetric) qs.set("metric", activeMetric);
    const q = qs.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
  }, [activeTab, activeMetric]);

  return (
    <div className="space-y-6">
      {/* Hero chamativo */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#1A2C42] to-[#3a2a0a] px-7 py-8 lg:py-10">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-brand-gold/30 p-2">
              <Globe className="h-6 w-6 text-brand-gold" />
            </div>
            <Badge className="bg-brand-gold/20 text-brand-gold border-brand-gold/40">
              Mineral Intelligence
            </Badge>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white mb-2">
            Inteligência do mercado mineral brasileiro
          </h1>
          <p className="text-sm leading-relaxed text-white/70 max-w-2xl">
            Mercado, produção, território e regulatório. Dados públicos auditáveis
            (ANM, BCB, Comex, IBAMA) curados pela Summo, com análises que orientam
            decisões estratégicas em mineração.
          </p>
        </div>
      </section>

      {/* KPI Strip — manté m o mesmo (era a barra de KPIs principais) */}
      <KpiStrip />

      {/* Highlights chamativos públicos */}
      <PublicHighlights />

      {/* Macro-navegação: Dados de Mercado · Inteligência Summo */}
      <div className="flex gap-2 rounded-xl border bg-muted/30 p-1.5 w-full sm:w-fit">
        <button
          onClick={() => setMacro("dados")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${macro === "dados" ? "bg-white text-brand-navy shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Globe className="h-4 w-4" /> Dados de Mercado
        </button>
        <button
          onClick={() => setMacro("inteligencia")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${macro === "inteligencia" ? "bg-white text-brand-navy shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Sparkles className="h-4 w-4" /> Inteligência Summo
        </button>
      </div>

      {macro === "dados" ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {DATA_TAB_KEYS.map((key) => {
              const Icon = TAB_ICONS[key];
              return (
                <TabsTrigger key={key} value={key} className="gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  {TAB_LABELS[key]}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value="mercado" className="mt-0">
            <MercadoTab activeMetric={activeMetric} onMetricChange={setActiveMetric} />
          </TabsContent>
          <TabsContent value="ranking" className="mt-0">
            <RankingTab />
          </TabsContent>
          <TabsContent value="producao" className="mt-0">
            <ProducaoTab activeMetric={activeMetric} onMetricChange={setActiveMetric} />
          </TabsContent>
          <TabsContent value="territorio" className="mt-0">
            <TerritorioTab activeMetric={activeMetric} onMetricChange={setActiveMetric} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-8">
          <ProdutosTab />
          <div>
            <h3 className="font-heading text-lg font-semibold mb-1">Premium</h3>
            <p className="text-sm text-muted-foreground mb-3">Relatórios, alertas e datasets sob assinatura.</p>
            <PremiumTab />
          </div>
        </div>
      )}

      {/* CTA final */}
      <Card className="border-2 border-brand-orange/30 bg-gradient-to-br from-brand-orange/5 to-transparent">
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="text-center md:text-left">
            <h3 className="font-heading font-bold text-base">
              Quer aplicar isso ao seu negócio?
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              A Summo Quartile aplica essa inteligência em consultoria estratégica
              para mineradoras, investidores e empresas do setor mineral.
            </p>
          </div>
          <a
            href="https://summoquartile.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-orange/90 transition-colors flex-shrink-0"
          >
            Fale com a Summo
            <ArrowRight className="h-4 w-4" />
          </a>
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
        Fontes: BCB PTAX, ANM (CFEM, RAL, SIGMINE), Comex Stat/MDIC, IBAMA, SEMAD-MG, COPAM
      </p>
    </div>
  );
}

function PublicHighlights() {
  const [highlights, setHighlights] = useState<{
    topMunicipio: string;
    topMunicipioValor: number;
    topSubstancia: string;
    topSubstanciaValor: number;
  } | null>(null);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
    Promise.all([
      fetch(`${API}/intelligence/cfem/top-municipios`).then((r) => r.json()),
      fetch(`${API}/intelligence/cfem/top-substancias`).then((r) => r.json()),
    ])
      .then(([munis, subs]) => {
        const m = (munis?.rows || [])[0];
        const s = (subs?.rows || [])[0];
        if (m && s) {
          setHighlights({
            topMunicipio: m.municipio,
            topMunicipioValor: m.total,
            topSubstancia: s.substancia,
            topSubstanciaValor: s.total,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!highlights) return null;

  return (
    <div className="grid md:grid-cols-3 gap-3">
      <Card className="border-l-4 border-l-brand-gold">
        <CardContent className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Top município CFEM (acum.)</p>
          <p className="font-heading text-base font-bold mt-1 truncate">
            {capitalize(highlights.topMunicipio)}
          </p>
          <p className="text-sm text-brand-gold font-tabular font-bold mt-0.5">
            R$ {(highlights.topMunicipioValor / 1e9).toFixed(2)} bi
          </p>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-brand-teal">
        <CardContent className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Top substância CFEM (acum.)</p>
          <p className="font-heading text-base font-bold mt-1 truncate">
            {capitalize(highlights.topSubstancia)}
          </p>
          <p className="text-sm text-brand-teal font-tabular font-bold mt-0.5">
            R$ {(highlights.topSubstanciaValor / 1e9).toFixed(2)} bi
          </p>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-brand-orange">
        <CardContent className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Fontes integradas</p>
          <p className="font-heading text-base font-bold mt-1">
            16+ bases públicas
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            BCB, ANM, IBAMA, Comex, SEMAD
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function capitalize(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
