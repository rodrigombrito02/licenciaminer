"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Database,
  ExternalLink,
  Info,
  Landmark,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import {
  fetchOverviewStats,
  fetchMetaSources,
  fmtNumber,
  fmtPct,
  type OverviewStats,
  type SourceMeta,
} from "@/lib/api";
import { BUSINESS_UNITS, PARTNERS } from "@/lib/nav-config";

/* ── helpers ── */

function relativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const diffMs = Date.now() - d.getTime();
    const diffH = Math.floor(diffMs / 3_600_000);
    if (diffH < 1) return "agora";
    if (diffH < 24) return `${diffH}h atrás`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "ontem";
    if (diffD < 30) return `${diffD}d atrás`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

/* ── Page ── */

export default function HomePage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [sources, setSources] = useState<SourceMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setError(null);
    fetchOverviewStats()
      .then(setStats)
      .catch((e) => setError(e.message));
    fetchMetaSources()
      .then(setSources)
      .catch((e) => {
        console.error("sources:", e);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-10">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#1A2C42] to-[#0A2540] px-8 py-12 lg:px-12 lg:py-16">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Image
              src="/logo2.png"
              alt="Summo Quartile"
              width={48}
              height={48}
              className="rounded-xl"
            />
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-white lg:text-3xl">
                Summo Quartile
              </h1>
              <p className="text-sm font-medium text-brand-gold tracking-wide">
                Inteligência Estratégica para Mineração
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/70 max-w-lg">
            Plataforma integrada de dados, análise e consultoria para o setor
            mineral brasileiro. Dados públicos oficiais, auditáveis e rastreáveis
            à origem.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#modulos"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-orange/90"
            >
              Explorar a Plataforma
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/mapa"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              Ver Mapa
            </Link>
          </div>
        </div>
      </section>

      {/* ── Error state ── */}
      {error && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <p className="text-sm text-destructive">
              Erro ao carregar dados: {error}.
              <span className="text-muted-foreground">
                {" "}
                Verifique se a API está rodando.
              </span>
            </p>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Strip ── */}
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Decisões Ambientais"
            value={fmtNumber(stats.total_decisoes)}
            subtitle="processos analisados · SEMAD MG"
            icon={BarChart3}
          />
          <StatCard
            label="Aprovação Mineração"
            value={fmtPct(stats.taxa_aprovacao_mineracao)}
            subtitle={`${fmtNumber(stats.total_decisoes_mineracao)} decisões minerárias`}
            icon={TrendingUp}
            accentClass="bg-brand-teal"
          />
          <StatCard
            label="Processos ANM"
            value={fmtNumber(stats.total_processos_anm)}
            subtitle="títulos minerários · ANM SIGMINE"
            icon={Landmark}
          />
          <StatCard
            label="Licenças IBAMA"
            value={fmtNumber(stats.total_licencas_ibama)}
            subtitle="licenças federais catalogadas"
            icon={ShieldCheck}
            accentClass="bg-brand-orange"
          />
        </div>
      ) : !error ? (
        <KPISkeleton />
      ) : null}

      {/* ── Business Unit Cards ── */}
      <section id="modulos">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Módulos da Plataforma
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cinco unidades comerciais + ferramentas internas, integradas em uma plataforma única
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUSINESS_UNITS.map((unit) => {
            const Icon = unit.icon;
            if (unit.disabled) {
              return (
                <Card
                  key={unit.title}
                  className={`border ${unit.color} transition-shadow cursor-not-allowed`}
                >
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className="rounded-lg bg-muted p-2.5">
                      <Icon className={`h-5 w-5 ${unit.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-muted-foreground">
                        {unit.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        {unit.description}
                      </p>
                      <span className="mt-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Em breve
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return (
              <Link key={unit.title} href={unit.href}>
                <Card
                  className={`group border ${unit.color} transition-all hover:shadow-md h-full`}
                >
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className="rounded-lg bg-muted p-2.5 transition-colors group-hover:bg-muted/80">
                      <Icon className={`h-5 w-5 ${unit.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold group-hover:text-foreground">
                        {unit.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {unit.description}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/60 group-hover:translate-x-0.5" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Partners ── */}
      <section className="flex flex-col items-center gap-4 py-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
          Parceiros Tecnológicos
        </p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {PARTNERS.map((name) => (
            <span
              key={name}
              className="text-sm font-medium text-muted-foreground/40"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── Data Sources ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Database className="h-4 w-4 text-brand-teal" />
            Fontes de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Fonte</th>
                  <th className="pb-2 pr-4 text-right font-medium">
                    Registros
                  </th>
                  <th className="pb-2 pr-4 font-medium">Atualização</th>
                  <th className="pb-2 font-medium">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(sources ?? FALLBACK_SOURCES).map((src) => {
                  const isFresh = !!src.last_collected;
                  return (
                    <tr key={src.key ?? src.name}>
                      <td className="py-2 pr-4 font-medium">
                        <span
                          className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle"
                          style={{
                            background: isFresh
                              ? "var(--success)"
                              : "var(--danger)",
                          }}
                        />
                        {src.name}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {src.records != null ? (
                          fmtNumber(src.records)
                        ) : (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </td>
                      <td
                        className="py-2 pr-4 text-muted-foreground tabular-nums"
                        title={src.last_collected ?? undefined}
                      >
                        {src.last_collected
                          ? relativeTime(src.last_collected)
                          : "&mdash;"}
                      </td>
                      <td className="py-2">
                        {src.url ? (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-teal hover:underline"
                          >
                            verificar{" "}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Methodology ── */}
      <Accordion type="single" collapsible>
        <AccordionItem
          value="methodology"
          className="rounded-xl border bg-card shadow-sm"
        >
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2 font-heading text-base">
              <Info className="h-4 w-4 text-brand-orange" />
              Sobre / Metodologia
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                O Sistema Integrado Summo Quartile consolida dados de múltiplas
                fontes públicas oficiais para oferecer inteligência ambiental,
                mineral e operacional.
              </p>
              <p>
                <strong>Decisões SEMAD:</strong> Extraídas do portal de
                licenciamento ambiental do estado de Minas Gerais. Incluem
                decisões de deferimento, indeferimento e arquivamento
                classificadas por atividade (DN COPAM 217/2017), classe de
                impacto (1-6) e regional.
              </p>
              <p>
                <strong>ANM/SIGMINE:</strong> Dados de títulos minerários via
                ArcGIS REST API. Inclui processos de concessão de lavra,
                licenciamento, pesquisa e lavra garimpeira.
              </p>
              <p>
                <strong>CFEM:</strong> Compensação Financeira pela Exploração de
                Recursos Minerais, com dados de pagamentos por município e
                substância mineral.
              </p>
              <p>
                <strong>Auditabilidade:</strong> Todo registro no sistema é
                rastreável à URL da fonte original. Dados processados em formato
                Parquet e consultados via DuckDB.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ── Footer ── */}
      <footer className="flex flex-col items-center gap-2 py-6 text-center">
        <a
          href="https://summoquartile.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          summoquartile.com
        </a>
        <p className="text-[10px] text-muted-foreground/30">
          &copy; {new Date().getFullYear()} Summo Quartile. Todos os direitos
          reservados.
        </p>
      </footer>
    </div>
  );
}

const FALLBACK_SOURCES: SourceMeta[] = [
  {
    key: "mg_semad",
    name: "MG SEMAD Decisões",
    records: null,
    last_collected: null,
    url: "https://sistemas.meioambiente.mg.gov.br/licenciamento/site/consulta-licenca",
  },
  {
    key: "ibama_licencas",
    name: "IBAMA Licenças Federais",
    records: null,
    last_collected: null,
    url: "https://dadosabertos.ibama.gov.br/dados/SISLIC/sislic-licencas.json",
  },
  {
    key: "anm_processos",
    name: "ANM SIGMINE Processos",
    records: null,
    last_collected: null,
    url: "https://geo.anm.gov.br/arcgis/rest/services/SIGMINE/dados_anm/FeatureServer/0",
  },
  {
    key: "ibama_infracoes",
    name: "IBAMA Infrações Ambientais",
    records: null,
    last_collected: null,
    url: "https://dadosabertos.ibama.gov.br/dataset/fiscalizacao-auto-de-infracao",
  },
  {
    key: "anm_cfem",
    name: "ANM CFEM Royalties",
    records: null,
    last_collected: null,
    url: "https://app.anm.gov.br/dadosabertos/ARRECADACAO/",
  },
  {
    key: "anm_ral",
    name: "ANM RAL Produção",
    records: null,
    last_collected: null,
    url: "https://app.anm.gov.br/dadosabertos/AMB/",
  },
  {
    key: "receita_federal_cnpj",
    name: "Receita Federal CNPJ",
    records: null,
    last_collected: null,
    url: "https://brasilapi.com.br/api/cnpj/v1/",
  },
  {
    key: "copam_cmi",
    name: "COPAM CMI Reuniões",
    records: null,
    last_collected: null,
    url: "https://sistemas.meioambiente.mg.gov.br/reunioes/reuniao-copam/index-externo",
  },
  {
    key: "icmbio_ucs",
    name: "ICMBio Unidades Conservação",
    records: null,
    last_collected: null,
    url: "https://www.gov.br/icmbio/pt-br/assuntos/dados_geoespaciais/",
  },
];

function KPISkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-start gap-4 p-5">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
