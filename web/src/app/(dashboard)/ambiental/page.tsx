"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Database,
  ExternalLink,
  Info,
  Landmark,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Zap,
  CheckCircle2,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";
import { RoleGate } from "@/components/role-gate";
import { MktHero, StatBand, MktSection, FeatureCard, CTABand } from "@/components/marketing-ui";
import { AmbientalVisual } from "@/components/marketing-visuals";
import { useEffectiveRole } from "@/hooks/use-effective-role";
import {
  fetchOverviewStats,
  fetchMetaSources,
  fmtNumber,
  fmtPct,
  type OverviewStats,
  type SourceMeta,
} from "@/lib/api";

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

export default function AmbientalPage() {
  const roleState = useEffectiveRole();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [sources, setSources] = useState<SourceMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setError(null);
    fetchOverviewStats().then(setStats).catch((e) => setError(e.message));
    fetchMetaSources().then(setSources).catch(() => {});
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Visitante não logado → landing de marketing (sem fontes/auditoria/KPIs internos)
  if (roleState.status === "anonymous") return <AmbientalLanding />;

  return (
    <div className="space-y-8">
      <ModuleHero
        icon={ShieldCheck}
        badge="SQ Ambiental"
        title="Análise e conformidade ambiental para mineração"
        description="Dados públicos auditáveis e décadas de experiência Summo em licenciamento minerário. Da análise preliminar à Diligência completa, em minutos."
        variant="teal"
      />

      {/* 3 botões grandes — coração da página */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">O que você quer fazer?</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Três caminhos para diferentes objetivos.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <BigActionCard
            icon={Database}
            title="Análise de Dados Públicos"
            description="Explore a base completa: decisões SEMAD, processos ANM, infrações IBAMA, CFEM. Filtros e exportação."
            href="/explorar"
            color="teal"
          />
          <BigActionCard
            icon={Search}
            title="Análise Preliminar de Licenciamento"
            description="Avaliação em minutos: índice de sucesso do segmento, diagnóstico do processo e escopo estimado."
            href="/viabilidade"
            color="gold"
          />
          <BigActionCard
            icon={ShieldCheck}
            title="Diligência Summo"
            description="DD ambiental, conformidade de pilhas e mais. Metodologia em 5 fases automatizada com identidade Summo."
            href="/ambiental/diligencia"
            color="orange"
          />
        </div>
      </section>

      <RoleGate minRole="consultor">
        <section>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-heading text-lg font-semibold">Ferramentas internas</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded">Consultor Summo</span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">Gestão do ciclo de vida das licenças.</p>
          <div className="grid md:grid-cols-3 gap-4">
            <BigActionCard
              icon={ClipboardCheck}
              title="Radar de Condicionantes"
              description="Cada condicionante vira uma obrigação com prazo e status. Suba a licença, acompanhe o que vence, comprove o cumprimento. Alvo do piloto Jaguar."
              href="/condicionantes"
              color="teal"
              badge="Novo"
            />
          </div>
        </section>
      </RoleGate>

      {/* Value props — por que escolher SQ Ambiental */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Por que SQ Ambiental</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Três diferenciais que tornam nossas análises mais rápidas e confiáveis.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <ValueProp
            icon={CheckCircle2}
            title="Dados auditáveis"
            description="Cada registro do sistema é rastreável até a URL da fonte oficial (SEMAD, IBAMA, ANM). Sem caixa preta."
            color="teal"
          />
          <ValueProp
            icon={Zap}
            title="Análise em minutos"
            description="O que tradicionalmente leva semanas — diagnóstico documental, scoring, recomendações — sai em segundos com a metodologia automatizada Summo."
            color="gold"
          />
          <ValueProp
            icon={FileText}
            title="Identidade Summo"
            description="Relatórios prontos para apresentar a clientes e órgãos reguladores, com padrão visual e metodológico Summo Quartile."
            color="orange"
          />
        </div>
      </section>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <p className="text-sm text-destructive">
              Erro ao carregar dados: {error}.
              <span className="text-muted-foreground"> Verifique se a API está respondendo.</span>
            </p>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">A base de conhecimento</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Volume agregado do que processamos para análises ambientais hoje.
        </p>
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
      </section>

      {/* Fontes + Metodologia em accordion FECHADO */}
      <Accordion type="multiple" className="space-y-3">
        <AccordionItem value="fontes" className="rounded-xl border bg-card shadow-sm">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2 font-heading text-base">
              <Database className="h-4 w-4 text-brand-teal" />
              Fontes de Dados <span className="text-xs text-muted-foreground font-normal">(clique para ver as 9 bases)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Fonte</th>
                    <th className="pb-2 pr-4 text-right font-medium">Registros</th>
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
                            style={{ background: isFresh ? "var(--success)" : "var(--danger)" }}
                          />
                          {src.name}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {src.records != null ? fmtNumber(src.records) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground tabular-nums" title={src.last_collected ?? undefined}>
                          {src.last_collected ? relativeTime(src.last_collected) : "—"}
                        </td>
                        <td className="py-2">
                          {src.url ? (
                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-teal hover:underline">
                              verificar <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="metodologia" className="rounded-xl border bg-card shadow-sm">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2 font-heading text-base">
              <Info className="h-4 w-4 text-brand-orange" /> Metodologia e Auditabilidade
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>O módulo SQ Ambiental consolida dados de múltiplas fontes públicas oficiais para oferecer inteligência regulatória.</p>
              <p>
                <strong>Decisões SEMAD:</strong> Extraídas do portal de licenciamento ambiental de Minas Gerais. Incluem deferimento, indeferimento e arquivamento classificadas por atividade (DN COPAM 217/2017), classe de impacto (1-6) e regional.
              </p>
              <p>
                <strong>ANM/SIGMINE:</strong> Dados de títulos minerários via ArcGIS REST API — concessão de lavra, licenciamento, pesquisa e lavra garimpeira.
              </p>
              <p>
                <strong>CFEM:</strong> Compensação Financeira pela Exploração de Recursos Minerais, com pagamentos por município e substância.
              </p>
              <p>
                <strong>Auditabilidade:</strong> Cada registro é rastreável à URL da fonte original. Dados processados em Parquet, consultados via DuckDB.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/* ── Landing pública (visitante não logado) ── */
function AmbientalLanding() {
  return (
    <div className="space-y-12">
      <MktHero
        eyebrow="SQ Ambiental"
        icon={ShieldCheck}
        title={<>Licenciamento ambiental sem <span className="text-brand-gold">surpresa</span>.</>}
        subtitle="Da análise preliminar do seu segmento à Diligência Summo completa — conformidade ambiental e minerária apoiada em dados públicos auditáveis e na senioridade de quem conhece o setor."
        cor="teal"
        visual={<AmbientalVisual />}
      />

      <StatBand stats={[
        { value: "9", label: "bases públicas oficiais integradas" },
        { value: "5 fases", label: "Due Diligence automatizada" },
        { value: "ANM + SEMAD", label: "licenciamento minerário + ambiental" },
        { value: "100%", label: "rastreável à fonte" },
      ]} />

      <MktSection titulo="Como a SQ Ambiental atua" sub="Três frentes que cobrem o ciclo do licenciamento.">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard icon={Search} cor="teal" titulo="Análise preliminar"
            descricao="Em minutos, o índice de sucesso do seu segmento e o diagnóstico do processo — antes de comprometer recursos."
            bullets={["Índice de sucesso por atividade/classe", "Fatores de atenção", "Escopo estimado"]} />
          <FeatureCard icon={ClipboardCheck} cor="gold" titulo="Radar de Condicionantes"
            descricao="Cada condicionante vira obrigação com prazo e status — ambiental e ANM no mesmo radar."
            bullets={["Prazos automáticos", "Comprovação de cumprimento", "Alvo do piloto Jaguar"]} />
          <FeatureCard icon={ShieldCheck} cor="orange" titulo="Diligência Summo"
            descricao="DD ambiental e conformidade de pilhas com metodologia em 5 fases e identidade Summo."
            bullets={["Inventário documental", "Scoring de criticidade", "Relatório pronto para o cliente"]} />
        </div>
      </MktSection>

      <MktSection titulo="Por que a SQ Ambiental" sub="Rápida, confiável e auditável.">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard icon={CheckCircle2} cor="teal" titulo="Dados auditáveis"
            descricao="Cada registro rastreável à URL da fonte oficial (SEMAD, IBAMA, ANM). Sem caixa-preta." />
          <FeatureCard icon={Zap} cor="gold" titulo="Análise em minutos"
            descricao="O que levava semanas — diagnóstico, scoring, recomendações — sai em segundos." />
          <FeatureCard icon={FileText} cor="orange" titulo="Senioridade que assina"
            descricao="Relatórios prontos para clientes e órgãos, com o padrão metodológico Summo Quartile." />
        </div>
      </MktSection>

      <CTABand titulo="Vai licenciar ou comprar um ativo?" sub="Comece com uma análise preliminar. Fale com a SQ Ambiental." />
    </div>
  );
}

function ValueProp({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: "teal" | "gold" | "orange";
}) {
  const colorMap = {
    teal: "border-l-brand-teal bg-brand-teal/5 text-brand-teal",
    gold: "border-l-brand-gold bg-brand-gold/5 text-brand-gold",
    orange: "border-l-brand-orange bg-brand-orange/5 text-brand-orange",
  }[color];

  return (
    <Card className={`border-l-4 ${colorMap}`}>
      <CardContent className="p-4 space-y-2">
        <Icon className="h-5 w-5" />
        <h4 className="font-bold text-sm text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

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

const FALLBACK_SOURCES: SourceMeta[] = [
  { key: "mg_semad", name: "MG SEMAD Decisões", records: null, last_collected: null, url: "https://sistemas.meioambiente.mg.gov.br/licenciamento/site/consulta-licenca" },
  { key: "ibama_licencas", name: "IBAMA Licenças Federais", records: null, last_collected: null, url: "https://dadosabertos.ibama.gov.br/dados/SISLIC/sislic-licencas.json" },
  { key: "anm_processos", name: "ANM SIGMINE Processos", records: null, last_collected: null, url: "https://geo.anm.gov.br/arcgis/rest/services/SIGMINE/dados_anm/FeatureServer/0" },
  { key: "ibama_infracoes", name: "IBAMA Infrações Ambientais", records: null, last_collected: null, url: "https://dadosabertos.ibama.gov.br/dataset/fiscalizacao-auto-de-infracao" },
  { key: "anm_cfem", name: "ANM CFEM Royalties", records: null, last_collected: null, url: "https://app.anm.gov.br/dadosabertos/ARRECADACAO/" },
  { key: "anm_ral", name: "ANM RAL Produção", records: null, last_collected: null, url: "https://app.anm.gov.br/dadosabertos/AMB/" },
  { key: "receita_federal_cnpj", name: "Receita Federal CNPJ", records: null, last_collected: null, url: "https://brasilapi.com.br/api/cnpj/v1/" },
  { key: "copam_cmi", name: "COPAM CMI Reuniões", records: null, last_collected: null, url: "https://sistemas.meioambiente.mg.gov.br/reunioes/reuniao-copam/index-externo" },
  { key: "icmbio_ucs", name: "ICMBio Unidades Conservação", records: null, last_collected: null, url: "https://www.gov.br/icmbio/pt-br/assuntos/dados_geoespaciais/" },
];
