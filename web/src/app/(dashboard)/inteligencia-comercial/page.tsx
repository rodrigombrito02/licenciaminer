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
  Layers,
  Package,
  Anchor,
  Train,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MercadoTab } from "./tab-mercado";
import { ProducaoTab } from "./tab-producao";
import { TerritorioTab } from "./tab-territorio";
import { RankingTab } from "./tab-ranking";
import { PremiumTab } from "./tab-premium";
import { ProdutosTab } from "./tab-produtos";
import { TabPellets } from "./tab-pellets";
import { IntelligenceVisual } from "@/components/marketing-visuals";
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
  mercado: "Preço",
  ranking: "Produção",
  producao: "Vendas",
  territorio: "Iron Ore Pellets",
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
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="lg:flex-1 max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-brand-gold/30 p-2">
                <Globe className="h-6 w-6 text-brand-gold" />
              </div>
              <Badge className="bg-brand-gold/20 text-brand-gold border-brand-gold/40">
                Inteligência de Mercado
              </Badge>
            </div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white mb-2">
              Inteligência de mercado mineral, sem paralelo no setor
            </h1>
            <p className="text-sm leading-relaxed text-white/70 max-w-2xl">
              Análise do mercado mineral brasileiro e internacional com profundidade
              que o setor não encontra em nenhum outro lugar.
            </p>
          </div>
          <div className="lg:w-[38%] lg:shrink-0"><IntelligenceVisual /></div>
        </div>
      </section>

      {/* 3 pilares */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: DollarSign, titulo: "Mercado", desc: "Precificação, concorrência, logística de escoamento e comércio exterior.", cor: "#FFC000" },
          { icon: Layers, titulo: "Projetos", desc: "Pipeline, reservas, teor, CAPEX, estágio e ranking de atratividade.", cor: "#156082" },
          { icon: Package, titulo: "Produto", desc: "Qualidade química, física e aplicações.", cor: "#0E7490" },
        ].map((p) => (
          <Card key={p.titulo} className="border-l-4" style={{ borderLeftColor: p.cor }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <p.icon className="h-4 w-4" style={{ color: p.cor }} />
                <h3 className="font-heading font-bold text-sm">{p.titulo}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lead da seção */}
      <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
        <strong className="text-foreground">Inteligência de mercado em mineração.</strong>{" "}
        Mercado, precificação, concorrência, projetos. Dados públicos nacionais e
        internacionais tratados pela Summo, com análises que orientam decisões
        estratégicas em mineração e logística.
      </p>

      {/* 3 quadros de conteúdo */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Globe className="h-4 w-4 text-brand-teal" />
              <h3 className="font-heading font-bold text-sm">Cadeias minerais cobertas</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ferro, terras raras, grafita, lítio, cobre, ouro, níquel, nióbio,
              calcário e bauxita.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Anchor className="h-4 w-4 text-brand-gold" />
              <h3 className="font-heading font-bold text-sm">Especialista em Minério de Ferro</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pelotas, pellet feed, finos e lump; mercado doméstico e exportações;
              precificação estratégica.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Train className="h-4 w-4 text-brand-orange" />
              <h3 className="font-heading font-bold text-sm">Logística</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rota por produto (mina → ferrovia → porto/terminal); corredores EFVM,
              MRS e Norte/Nordeste; o gargalo logístico que destrava ou trava novos
              projetos.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fontes — faixa discreta */}
      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
        <span className="font-medium text-muted-foreground">Fontes integradas:</span>{" "}
        ANM · ABM · MDIC/SECEX · Instituto Aço Brasil · Sindifer · Fundação Gorceix ·
        ITC Trade Map · IEEFA · industrytransition · globalenergymonitor ·
        European Commission · Primetals · Midrex · LME · COMEX.
      </p>

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
            <h3 className="font-heading text-lg font-semibold mb-1">Iron Ore Pellets (Premium)</h3>
            <p className="text-sm text-muted-foreground mb-3">Inteligência premium de pelotas de minério de ferro.</p>
            <TabPellets />
          </div>
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

