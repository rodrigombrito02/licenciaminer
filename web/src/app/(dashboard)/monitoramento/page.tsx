"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  ExternalLink,
  Factory,
  Globe,
  Landmark,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  fetchMonitoringTopEmpresas,
  fetchMonitoringPipeline,
  fetchMonitoringProjetos,
  fmtNumber,
  type MonitoringEmpresa,
  type PipelineItem,
  type ProjetosResponse,
} from "@/lib/api";
import { fmtReais } from "@/lib/format";

/* ── helpers ── */

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("operacional") || s.includes("licenciado")) return "bg-success/10 text-success border-success/30";
  if (s.includes("execução") || s.includes("ramp")) return "bg-brand-teal/10 text-brand-teal border-brand-teal/30";
  if (s.includes("estudo") || s.includes("viabilidade") || s.includes("planejado")) return "bg-warning/10 text-warning border-warning/30";
  if (s.includes("licenciamento") || s.includes("anunciado") || s.includes("piloto")) return "bg-brand-orange/10 text-brand-orange border-brand-orange/30";
  return "bg-muted text-muted-foreground";
}

function fmtInvestimento(valor: number | null, moeda: string): string {
  if (!valor) return "";
  if (moeda === "USD") {
    if (valor >= 1e9) return `US$ ${(valor / 1e9).toFixed(1)} bi`;
    if (valor >= 1e6) return `US$ ${(valor / 1e6).toFixed(0)} M`;
    return `US$ ${fmtNumber(valor)}`;
  }
  if (valor >= 1e9) return `R$ ${(valor / 1e9).toFixed(1)} bi`;
  if (valor >= 1e6) return `R$ ${(valor / 1e6).toFixed(0)} M`;
  return fmtReais(valor);
}

/* ── Page ── */

export default function MonitoramentoPage() {
  const [empresas, setEmpresas] = useState<MonitoringEmpresa[] | null>(null);
  const [pipeline, setPipeline] = useState<PipelineItem[] | null>(null);
  const [projetos, setProjetos] = useState<ProjetosResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchMonitoringTopEmpresas(20),
      fetchMonitoringPipeline(),
      fetchMonitoringProjetos(),
    ])
      .then(([emp, pip, proj]) => {
        setEmpresas(emp);
        setPipeline(pip);
        setProjetos(proj);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalProcessos = pipeline?.reduce((s, p) => s + p.n, 0) ?? 0;
  const totalCFEM = empresas?.reduce((s, e) => s + (e.cfem_total || 0), 0) ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-gold/10 p-2.5">
            <Activity className="h-6 w-6 text-brand-gold" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight lg:text-3xl">
              Monitoramento de Indicadores
            </h1>
            <p className="text-sm text-muted-foreground">
              Observatório da mineração brasileira — dados compilados de fontes públicas oficiais
            </p>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-brand-teal/10 p-2"><Landmark className="h-4 w-4 text-brand-teal" /></div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Processos ANM</p>
                  <p className="text-2xl font-bold tabular-nums">{fmtNumber(totalProcessos)}</p>
                  <p className="text-[10px] text-muted-foreground">Cadastro Mineiro Nacional</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-brand-gold/10 p-2"><BarChart3 className="h-4 w-4 text-brand-gold" /></div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">CFEM Acumulado</p>
                  <p className="text-2xl font-bold tabular-nums">{fmtReais(totalCFEM)}</p>
                  <p className="text-[10px] text-muted-foreground">Top 20 empresas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-brand-orange/10 p-2"><Factory className="h-4 w-4 text-brand-orange" /></div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Projetos em Destaque</p>
                  <p className="text-2xl font-bold tabular-nums">{projetos?.total ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Base curada com fontes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-success/10 p-2"><Globe className="h-4 w-4 text-success" /></div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Empresas Mapeadas</p>
                  <p className="text-2xl font-bold tabular-nums">{empresas?.length ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Com 20+ processos ANM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="projetos">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="projetos">Projetos em Destaque</TabsTrigger>
          <TabsTrigger value="empresas">Maiores Empresas</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Nacional</TabsTrigger>
        </TabsList>

        {/* Tab: Projetos */}
        <TabsContent value="projetos" className="space-y-4">
          {projetos && (
            <>
              <p className="text-xs text-muted-foreground">
                {projetos.total} projetos curados · Atualizado em {projetos.atualizado_em} · Cada projeto com fonte rastreável
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                {projetos.projetos.map((p) => (
                  <Card key={p.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold">{p.projeto}</p>
                          <p className="text-xs text-muted-foreground">{p.empresa}</p>
                        </div>
                        <Badge variant="outline" className={`text-[9px] shrink-0 ${statusColor(p.status)}`}>
                          {p.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {p.localizacao.municipio ? `${p.localizacao.municipio}, ` : ""}{p.localizacao.uf}
                        </span>
                        <span>{p.substancia}</span>
                        {p.investimento_valor && (
                          <span className="font-semibold text-foreground">
                            {fmtInvestimento(p.investimento_valor, p.investimento_moeda)}
                          </span>
                        )}
                        {p.previsao && <span>Previsão: {p.previsao}</span>}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{p.detalhe_status}</p>

                      <div className="flex flex-wrap gap-2">
                        {p.fontes.map((f, i) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-brand-teal hover:underline"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            {f.titulo.length > 45 ? f.titulo.slice(0, 45) + "..." : f.titulo}
                          </a>
                        ))}
                      </div>

                      {p.cnpj && (
                        <Link
                          href={`/empresa?cnpj=${p.cnpj}`}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-orange hover:underline"
                        >
                          <Building2 className="h-3 w-3" />
                          Ver dossier da empresa
                          <ArrowRight className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab: Empresas */}
        <TabsContent value="empresas" className="space-y-4">
          {empresas && (
            <>
              <p className="text-xs text-muted-foreground">
                Top {empresas.length} empresas por volume de processos minerários · Dados: ANM Cadastro Mineiro + CFEM
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">#</th>
                      <th className="pb-2 pr-4 font-medium">Empresa</th>
                      <th className="pb-2 pr-4 text-right font-medium">Processos</th>
                      <th className="pb-2 pr-4 text-right font-medium">Pesquisas</th>
                      <th className="pb-2 pr-4 text-right font-medium">Lavras</th>
                      <th className="pb-2 pr-4 text-right font-medium">CFEM (R$)</th>
                      <th className="pb-2 font-medium">Substância</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {empresas.map((e, i) => (
                      <tr key={e.cnpj} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-4 text-muted-foreground tabular-nums">{i + 1}</td>
                        <td className="py-2 pr-4 font-medium max-w-[200px] truncate">
                          {e.cnpj ? (
                            <Link href={`/empresa?cnpj=${e.cnpj}`} className="hover:text-brand-teal hover:underline">
                              {e.empresa}
                            </Link>
                          ) : e.empresa}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums font-semibold">{fmtNumber(e.total_processos)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{fmtNumber(e.pesquisas)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{fmtNumber(e.lavras)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {e.cfem_total > 0 ? fmtReais(e.cfem_total) : "—"}
                        </td>
                        <td className="py-2 text-muted-foreground truncate max-w-[120px]">{e.substancia_exemplo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab: Pipeline */}
        <TabsContent value="pipeline" className="space-y-4">
          {pipeline && (
            <>
              <p className="text-xs text-muted-foreground">
                Pipeline do Cadastro Mineiro Nacional — {fmtNumber(totalProcessos)} processos em todas as fases
              </p>
              <div className="space-y-2">
                {pipeline
                  .filter((p) => p.n >= 100)
                  .map((p) => {
                    const pct = totalProcessos > 0 ? (p.n / totalProcessos) * 100 : 0;
                    return (
                      <div key={p.fase_atual} className="flex items-center gap-3">
                        <div className="w-56 min-w-0 text-right">
                          <p className="text-xs truncate">{p.fase_atual}</p>
                        </div>
                        <div className="flex-1">
                          <Progress value={pct} className="h-4" />
                        </div>
                        <span className="text-xs font-bold tabular-nums w-20 text-right">{fmtNumber(p.n)}</span>
                        <span className="text-[10px] text-muted-foreground w-12 text-right tabular-nums">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-center text-[10px] text-muted-foreground/40">
        Dados: ANM Cadastro Mineiro · CFEM · Fontes públicas curadas · Atualização periódica
      </p>
    </div>
  );
}
