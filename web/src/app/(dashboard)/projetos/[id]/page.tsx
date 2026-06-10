"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ClipboardCheck,
  DollarSign,
  FileText,
  FolderOpen,
  GanttChartSquare,
  GitPullRequest,
  Layers,
  ShieldCheck,
  ShoppingCart,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ClassificacaoBadge } from "@/components/riscos/classificacao-badge";
import {
  EPCM_COR,
  EPCM_LABEL,
  EXECUTOR_COR,
  fetchChangeRequests,
  fetchCharter,
  fetchCostCategories,
  fetchCronograma,
  fetchDecisoes,
  fetchEVMSnapshots,
  fetchProcurementDashboard,
  fetchMarcosSuprimentos,
  fetchContratos,
  fetchRFPs,
  fetchQualityDashboard,
  fetchProjetoResumo,
  fetchWBSMatrizRiscos,
  fetchWBSTree,
  recalcularCPM,
  type ChangeRequest,
  type Charter,
  type CostCategory,
  type Cronograma,
  type Decision,
  type EVMSnapshot,
  type ProjetoResumo,
  type ProcurementDashboard,
  type QualityDashboard,
  type Contrato as ContratoItem,
  type RFPItem,
  type MarcoSuprimentos,
  type WBSNode,
  type WBSRiscoItem,
} from "@/lib/pmsuite-api";
import { GanttCronograma } from "@/components/pmsuite/gantt-cronograma";
import { EVMChart } from "@/components/pmsuite/evm-chart";
import { Button } from "@/components/ui/button";

export default function ProjetoHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = use(params);
  const id = Number(idStr);

  const [resumo, setResumo] = useState<ProjetoResumo | null>(null);
  const [charter, setCharter] = useState<Charter | null>(null);
  const [wbsTree, setWbsTree] = useState<WBSNode[]>([]);
  const [wbsMatriz, setWbsMatriz] = useState<WBSRiscoItem[]>([]);
  const [crs, setCrs] = useState<ChangeRequest[]>([]);
  const [decisoes, setDecisoes] = useState<Decision[]>([]);
  const [cronograma, setCronograma] = useState<Cronograma | null>(null);
  const [custos, setCustos] = useState<CostCategory[]>([]);
  const [evm, setEvm] = useState<EVMSnapshot[]>([]);
  const [quality, setQuality] = useState<QualityDashboard | null>(null);
  const [procurement, setProcurement] = useState<ProcurementDashboard | null>(null);
  const [contratos, setContratos] = useState<ContratoItem[]>([]);
  const [rfps, setRfps] = useState<RFPItem[]>([]);
  const [marcosSup, setMarcosSup] = useState<MarcoSuprimentos[]>([]);

  useEffect(() => {
    fetchProjetoResumo(id).then(setResumo);
    fetchCharter(id).then(setCharter).catch(() => setCharter(null));
    fetchWBSTree(id).then(setWbsTree);
    fetchWBSMatrizRiscos(id).then(setWbsMatriz);
    fetchChangeRequests(id).then(setCrs);
    fetchDecisoes(id).then(setDecisoes);
    fetchCronograma(id).then(setCronograma);
    fetchCostCategories(id).then(setCustos);
    fetchEVMSnapshots(id).then(setEvm);
    fetchQualityDashboard(id).then(setQuality).catch(() => setQuality(null));
    fetchProcurementDashboard(id).then(setProcurement).catch(() => setProcurement(null));
    fetchContratos(id).then(setContratos).catch(() => setContratos([]));
    fetchRFPs(id).then(setRfps).catch(() => setRfps([]));
    fetchMarcosSuprimentos(id).then(setMarcosSup).catch(() => setMarcosSup([]));
  }, [id]);

  if (!resumo) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const fmtBRL = (v?: number | null) =>
    v == null
      ? "—"
      : new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
          notation: "compact",
        }).format(v);

  const p = resumo.projeto;

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-muted-foreground">
          <Link href="/projetos" className="hover:underline">
            Projetos
          </Link>{" "}
          / <span className="font-mono">{p.codigo}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{p.nome}</h1>
            {p.descricao && (
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{p.descricao}</p>
            )}
          </div>
          <span
            className="rounded px-3 py-1 text-xs font-bold uppercase text-white"
            style={{ backgroundColor: "#16a34a" }}
          >
            {p.status.replace("_", " ")}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Mini label="Orçamento" value={fmtBRL(p.orcamento)} accent="#0f766e" />
        <Mini label="Início" value={p.data_inicio ?? "—"} />
        <Mini label="Fim" value={p.data_fim ?? "—"} />
        <Mini label="Owner" value={p.owner_nome ?? "—"} />
        <Mini label="Riscos" value={String(resumo.total_riscos)} accent="#dc2626" />
        <Mini
          label="Charter"
          value={resumo.charter_status?.toUpperCase() ?? "—"}
          accent={resumo.charter_existe ? "#16a34a" : "#dc2626"}
        />
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">
            <FolderOpen className="mr-1 h-3.5 w-3.5" /> Resumo
          </TabsTrigger>
          <TabsTrigger value="charter">
            <FileText className="mr-1 h-3.5 w-3.5" /> Charter
          </TabsTrigger>
          <TabsTrigger value="wbs">
            <Layers className="mr-1 h-3.5 w-3.5" /> WBS ({resumo.wbs_total_nodes})
          </TabsTrigger>
          <TabsTrigger value="cronograma">
            <GanttChartSquare className="mr-1 h-3.5 w-3.5" /> Cronograma
          </TabsTrigger>
          <TabsTrigger value="custos">
            <DollarSign className="mr-1 h-3.5 w-3.5" /> Custos & EVM
          </TabsTrigger>
          <TabsTrigger value="qualidade">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Qualidade
            {quality && quality.kpis.ncs_criticas_abertas > 0 && (
              <span className="ml-1 rounded bg-red-500 px-1 text-[10px] font-bold text-white">
                {quality.kpis.ncs_criticas_abertas}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="aquisicoes">
            <ShoppingCart className="mr-1 h-3.5 w-3.5" /> Aquisições
            {procurement && procurement.kpis.marcos_em_risco + procurement.kpis.marcos_atrasados > 0 && (
              <span className="ml-1 rounded bg-amber-500 px-1 text-[10px] font-bold text-white">
                {procurement.kpis.marcos_em_risco + procurement.kpis.marcos_atrasados}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="matriz-riscos">
            <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Riscos × WBS
          </TabsTrigger>
          <TabsTrigger value="crs">
            <GitPullRequest className="mr-1 h-3.5 w-3.5" /> CRs ({resumo.total_crs})
          </TabsTrigger>
          <TabsTrigger value="decisoes">
            <ClipboardCheck className="mr-1 h-3.5 w-3.5" /> Decisões ({resumo.total_decisoes})
          </TabsTrigger>
        </TabsList>

        {/* ====== RESUMO ====== */}
        <TabsContent value="resumo" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Mini label="Nós WBS" value={String(resumo.wbs_total_nodes)} />
            <Mini label="Marcos" value={String(resumo.wbs_marcos)} accent="#f59e0b" />
            <Mini label="Pacotes críticos" value={String(resumo.wbs_criticos)} accent="#dc2626" />
            <Mini label="Long-lead items" value={String(resumo.wbs_long_leads)} accent="#a855f7" />
            <Mini label="Serviços contratados" value={String(resumo.wbs_servicos_contratados)} accent="#8b5cf6" />
            <Mini
              label="CRs abertas"
              value={String(resumo.crs_abertas)}
              accent={resumo.crs_abertas > 0 ? "#f59e0b" : undefined}
            />
            <Mini
              label="Riscos c/ WBS"
              value={`${resumo.riscos_com_wbs}/${resumo.total_riscos}`}
              accent="#16a34a"
            />
            <Mini label="Decisões" value={String(resumo.total_decisoes)} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Modalidade EPCM descentralizado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(resumo.por_disciplina_epcm)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs">
                      <span
                        className="inline-flex h-5 w-8 items-center justify-center rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: EPCM_COR[k] ?? "#64748b" }}
                      >
                        {k}
                      </span>
                      <span className="flex-1">{EPCM_LABEL[k] ?? k}</span>
                      <span className="font-mono text-muted-foreground">{v} pacote(s)</span>
                    </div>
                  ))}
                <p className="mt-2 rounded bg-muted/30 p-2 text-[11px] text-muted-foreground">
                  Ciclo padrão de contratos de serviço neste projeto:{" "}
                  <strong>150 dias</strong> (suprimentos: ET → RFP → técnica → comercial → contrato)
                  + <strong>45 dias</strong> (mobilização).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Por executor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(resumo.por_executor)
                  .sort(([, a], [, b]) => b - a)
                  .map(([k, v]) => {
                    const cor = EXECUTOR_COR[k] ?? "#64748b";
                    return (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span
                          className="inline-block h-3 w-3 rounded"
                          style={{ backgroundColor: cor }}
                        />
                        <span className="flex-1 capitalize">{k}</span>
                        <span className="font-mono text-muted-foreground">{v}</span>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-amber-500" /> Próximos marcos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {resumo.proximos_marcos.map((m) => (
                <div
                  key={m.codigo}
                  className="flex items-center gap-3 rounded border border-border p-2 text-xs"
                >
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span className="w-24 font-mono text-muted-foreground">{m.data}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{m.codigo}</span>
                  <span className="flex-1">{m.nome}</span>
                  {m.is_terceirizado && (
                    <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      TERCEIRO
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== CHARTER ====== */}
        <TabsContent value="charter" className="pt-3">
          {!charter ? (
            <p className="text-sm text-muted-foreground">Sem charter cadastrado.</p>
          ) : (
            <div className="space-y-3">
              <CharterSection title="Objetivo SMART" text={charter.objetivo_smart} />
              <CharterSection title="Justificativa" text={charter.justificativa} />
              <CharterSection title="Business Case" text={charter.business_case} />
              <CharterSection title="Benefícios Esperados" text={charter.beneficios_esperados} />
              <CharterSection title="Escopo Incluído" text={charter.escopo_incluido} />
              <CharterSection title="Escopo Excluído" text={charter.escopo_excluido} />
              <CharterSection title="Entregáveis Principais" text={charter.entregaveis_principais} />
              <CharterSection title="Premissas" text={charter.premissas} />
              <CharterSection title="Restrições" text={charter.restricoes} />
              <CharterSection title="Critérios de Sucesso" text={charter.criterios_sucesso} />
              <CharterSection title="Critérios de Aceitação" text={charter.criterios_aceitacao} />
              <CharterSection title="Comitê Steering" text={charter.comite_steering} />

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Mini label="Sponsor" value={charter.sponsor_nome ?? "—"} />
                <Mini label="Gerente" value={charter.gerente_projeto_nome ?? "—"} />
                <Mini label="Aprovador" value={charter.aprovador_nome ?? "—"} />
                <Mini
                  label="Aprovado em"
                  value={charter.data_aprovacao ?? "—"}
                  accent="#16a34a"
                />
                <Mini
                  label="CAPEX base"
                  value={fmtBRL(charter.orcamento_total)}
                />
                <Mini
                  label="Contingência"
                  value={fmtBRL(charter.orcamento_contingencia)}
                  accent="#f59e0b"
                />
                <Mini label="Início" value={charter.data_inicio_prevista ?? "—"} />
                <Mini label="Fim" value={charter.data_termino_prevista ?? "—"} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ====== WBS ====== */}
        <TabsContent value="wbs" className="pt-3">
          <div className="space-y-1">
            {wbsTree.map((n) => (
              <WBSNodeRow key={n.id} node={n} depth={0} />
            ))}
          </div>
        </TabsContent>

        {/* ====== CRONOGRAMA ====== */}
        <TabsContent value="cronograma" className="pt-3 space-y-3">
          {cronograma && cronograma.nodes.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded border border-border bg-muted/20 p-2 text-xs">
                  <span className="text-muted-foreground">Início calculado:</span>{" "}
                  <strong>{cronograma.data_inicio}</strong>
                </div>
                <div className="rounded border border-border bg-muted/20 p-2 text-xs">
                  <span className="text-muted-foreground">Término calculado:</span>{" "}
                  <strong>{cronograma.data_termino}</strong>
                </div>
                <div className="rounded border border-border bg-muted/20 p-2 text-xs">
                  <span className="text-muted-foreground">Pacotes no caminho crítico:</span>{" "}
                  <strong className="text-red-600">
                    {cronograma.nodes.filter((n) => n.caminho_critico && !n.is_marco).length}
                  </strong>
                </div>
                <div className="rounded border border-border bg-muted/20 p-2 text-xs">
                  <span className="text-muted-foreground">Dependências:</span>{" "}
                  <strong>{cronograma.dependencias.length}</strong>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={async () => {
                    await recalcularCPM(id);
                    const c = await fetchCronograma(id);
                    setCronograma(c);
                  }}
                >
                  ↻ Recalcular CPM
                </Button>
              </div>
              <GanttCronograma nodes={cronograma.nodes} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando cronograma…</p>
          )}
        </TabsContent>

        {/* ====== CUSTOS & EVM ====== */}
        <TabsContent value="custos" className="pt-3 space-y-4">
          {evm.length > 0 && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">S-Curve EVM (PV × EV × AC)</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    PMBoK §7.4 — Earned Value Management. BAC = R${" "}
                    {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
                      evm[0].bac,
                    )}
                    .
                  </p>
                </CardHeader>
                <CardContent>
                  <EVMChart snapshots={evm} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {(() => {
                  const last = evm[evm.length - 1];
                  return (
                    <>
                      <EVMKpi
                        label="SPI"
                        value={last.spi?.toFixed(2) ?? "—"}
                        hint="Schedule Performance Index (EV/PV)"
                        accent={
                          last.spi == null
                            ? undefined
                            : last.spi >= 0.95
                            ? "#16a34a"
                            : last.spi >= 0.85
                            ? "#f59e0b"
                            : "#dc2626"
                        }
                      />
                      <EVMKpi
                        label="CPI"
                        value={last.cpi?.toFixed(2) ?? "—"}
                        hint="Cost Performance Index (EV/AC)"
                        accent={
                          last.cpi == null
                            ? undefined
                            : last.cpi >= 0.95
                            ? "#16a34a"
                            : last.cpi >= 0.85
                            ? "#f59e0b"
                            : "#dc2626"
                        }
                      />
                      <EVMKpi
                        label="EAC"
                        value={fmtBRL(last.eac)}
                        hint="Estimate At Completion"
                        accent={
                          last.eac && last.eac > last.bac ? "#dc2626" : "#16a34a"
                        }
                      />
                      <EVMKpi
                        label="VAC"
                        value={fmtBRL(last.vac)}
                        hint="Variance At Completion"
                        accent={last.vac != null && last.vac < 0 ? "#dc2626" : "#16a34a"}
                      />
                    </>
                  );
                })()}
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Histórico trimestral ({evm.length} snapshots)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="border-b border-border bg-muted/30">
                        <tr>
                          <th className="p-2 text-left">Período</th>
                          <th className="p-2 text-right">PV</th>
                          <th className="p-2 text-right">EV</th>
                          <th className="p-2 text-right">AC</th>
                          <th className="p-2 text-right">SPI</th>
                          <th className="p-2 text-right">CPI</th>
                          <th className="p-2 text-right">EAC</th>
                          <th className="p-2 text-right">VAC</th>
                          <th className="p-2 text-left">Observações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...evm].reverse().map((s) => (
                          <tr key={s.id} className="border-b border-border/30">
                            <td className="p-2 font-mono">{s.periodo ?? s.data_snapshot}</td>
                            <td className="p-2 text-right font-mono">{fmtBRL(s.pv)}</td>
                            <td className="p-2 text-right font-mono">{fmtBRL(s.ev)}</td>
                            <td className="p-2 text-right font-mono">{fmtBRL(s.ac)}</td>
                            <td
                              className={`p-2 text-right font-mono font-bold ${
                                (s.spi ?? 1) < 0.95 ? "text-red-600" : "text-green-700"
                              }`}
                            >
                              {s.spi?.toFixed(2) ?? "—"}
                            </td>
                            <td
                              className={`p-2 text-right font-mono font-bold ${
                                (s.cpi ?? 1) < 0.95 ? "text-red-600" : "text-green-700"
                              }`}
                            >
                              {s.cpi?.toFixed(2) ?? "—"}
                            </td>
                            <td className="p-2 text-right font-mono">{fmtBRL(s.eac)}</td>
                            <td
                              className={`p-2 text-right font-mono ${
                                (s.vac ?? 0) < 0 ? "text-red-600" : "text-green-700"
                              }`}
                            >
                              {fmtBRL(s.vac)}
                            </td>
                            <td className="p-2 text-[10px] text-muted-foreground max-w-xs">
                              {s.observacoes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {custos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Breakdown orçamentário por categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {custos.map((c) => {
                  const cor = c.cor ?? "#64748b";
                  const pctComp = c.pct_comprometido ?? 0;
                  const pctReal = c.pct_realizado ?? 0;
                  return (
                    <div key={c.id}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded"
                            style={{ backgroundColor: cor }}
                          />
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {c.codigo}
                          </span>
                          <span className="font-medium">{c.nome}</span>
                          {c.tipo === "CONTINGENCIA" && (
                            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-700">
                              contingência
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {fmtBRL(c.orcamento_planejado)}
                        </span>
                      </div>
                      <div className="relative h-3 w-full rounded bg-muted">
                        <div
                          className="absolute top-0 h-3 rounded"
                          style={{
                            width: `${Math.min(100, pctComp)}%`,
                            backgroundColor: cor + "66",
                          }}
                          title={`Comprometido ${pctComp}%`}
                        />
                        <div
                          className="absolute top-0 h-3 rounded"
                          style={{ width: `${Math.min(100, pctReal)}%`, backgroundColor: cor }}
                          title={`Realizado ${pctReal}%`}
                        />
                      </div>
                      <div className="mt-0.5 flex gap-3 text-[10px] text-muted-foreground">
                        <span>Comprometido: {fmtBRL(c.orcamento_comprometido)} ({pctComp}%)</span>
                        <span>Realizado: {fmtBRL(c.valor_realizado)} ({pctReal}%)</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ====== QUALIDADE (M5 PMBoK §8 + ISO 9001) ====== */}
        <TabsContent value="qualidade" className="pt-3 space-y-3">
          {!quality ? (
            <p className="text-xs text-muted-foreground">Carregando métricas de qualidade…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Mini label="Requisitos" value={String(quality.kpis.requisitos_total)} accent="#0ea5e9" />
                <Mini
                  label="FPY"
                  value={
                    quality.kpis.first_pass_yield != null
                      ? `${(quality.kpis.first_pass_yield * 100).toFixed(0)}%`
                      : "—"
                  }
                  accent={
                    (quality.kpis.first_pass_yield ?? 0) >= 0.9
                      ? "#16a34a"
                      : (quality.kpis.first_pass_yield ?? 0) >= 0.7
                      ? "#f59e0b"
                      : "#dc2626"
                  }
                />
                <Mini
                  label="NCs abertas"
                  value={`${quality.kpis.ncs_abertas}/${quality.kpis.ncs_total}`}
                  accent={quality.kpis.ncs_criticas_abertas > 0 ? "#dc2626" : "#f59e0b"}
                />
                <Mini
                  label="Custo não-qualidade"
                  value={fmtBRL(quality.kpis.custo_nao_qualidade_total)}
                  accent="#dc2626"
                />
                <Mini label="Inspeções executadas" value={`${quality.kpis.inspecoes_aprovadas + quality.kpis.inspecoes_reprovadas}/${quality.kpis.inspecoes_total}`} />
                <Mini label="NCs críticas abertas" value={String(quality.kpis.ncs_criticas_abertas)} accent={quality.kpis.ncs_criticas_abertas > 0 ? "#dc2626" : undefined} />
                <Mini label="Auditorias concluídas" value={`${quality.kpis.auditorias_concluidas}/${quality.kpis.auditorias_total}`} />
                <Mini
                  label="Conformidade média"
                  value={
                    quality.kpis.conformidade_media_pct != null
                      ? `${quality.kpis.conformidade_media_pct.toFixed(1)}%`
                      : "—"
                  }
                  accent={
                    (quality.kpis.conformidade_media_pct ?? 0) >= 95
                      ? "#16a34a"
                      : (quality.kpis.conformidade_media_pct ?? 0) >= 85
                      ? "#f59e0b"
                      : "#dc2626"
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Requisitos por criticidade</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {Object.entries(quality.requisitos_por_criticidade)
                      .sort(
                        ([a], [b]) =>
                          ["critica", "alta", "media", "baixa"].indexOf(a) -
                          ["critica", "alta", "media", "baixa"].indexOf(b),
                      )
                      .map(([k, v]) => {
                        const cor =
                          k === "critica"
                            ? "#dc2626"
                            : k === "alta"
                            ? "#f59e0b"
                            : k === "media"
                            ? "#0ea5e9"
                            : "#64748b";
                        const total = quality.kpis.requisitos_total || 1;
                        const pct = (v / total) * 100;
                        return (
                          <div key={k} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="capitalize">{k}</span>
                              <span className="font-mono text-muted-foreground">{v}</span>
                            </div>
                            <div className="h-1.5 w-full rounded bg-muted">
                              <div
                                className="h-full rounded"
                                style={{ backgroundColor: cor, width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">NCs por severidade</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {Object.entries(quality.distribuicao_severidade)
                      .sort(
                        ([a], [b]) =>
                          ["critica", "alta", "media", "baixa"].indexOf(a) -
                          ["critica", "alta", "media", "baixa"].indexOf(b),
                      )
                      .map(([k, v]) => {
                        const cor =
                          k === "critica"
                            ? "#dc2626"
                            : k === "alta"
                            ? "#f59e0b"
                            : k === "media"
                            ? "#0ea5e9"
                            : "#64748b";
                        const total = quality.kpis.ncs_total || 1;
                        const pct = (v / total) * 100;
                        return (
                          <div key={k} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="capitalize">{k}</span>
                              <span className="font-mono text-muted-foreground">{v}</span>
                            </div>
                            <div className="h-1.5 w-full rounded bg-muted">
                              <div
                                className="h-full rounded"
                                style={{ backgroundColor: cor, width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Causa-raiz (Ishikawa 6M)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {Object.keys(quality.distribuicao_causa_ishikawa).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Sem NCs com causa-raiz classificada.
                      </p>
                    )}
                    {Object.entries(quality.distribuicao_causa_ishikawa)
                      .sort(([, a], [, b]) => b - a)
                      .map(([k, v]) => {
                        const total = Object.values(
                          quality.distribuicao_causa_ishikawa,
                        ).reduce((s, n) => s + n, 0);
                        const pct = (v / total) * 100;
                        return (
                          <div key={k} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="capitalize">
                                {k.replace("mao_de_obra", "mão-de-obra").replace(/_/g, " ")}
                              </span>
                              <span className="font-mono text-muted-foreground">{v}</span>
                            </div>
                            <div className="h-1.5 w-full rounded bg-muted">
                              <div
                                className="h-full rounded bg-purple-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              </div>

              {quality.metricas_historico.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Evolução trimestral</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Histórico de FPY, NCs abertas e custo de não-qualidade.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="border-b">
                          <tr className="text-left text-muted-foreground">
                            <th className="py-1.5 pr-3">Período</th>
                            <th className="py-1.5 pr-3">Inspeç. exec/plan</th>
                            <th className="py-1.5 pr-3">FPY</th>
                            <th className="py-1.5 pr-3">NCs ab./enc.</th>
                            <th className="py-1.5 pr-3">NCs crít.</th>
                            <th className="py-1.5 pr-3">TTR médio (d)</th>
                            <th className="py-1.5 pr-3">Conform.</th>
                            <th className="py-1.5 pr-3">Custo NQ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {quality.metricas_historico.map((m) => {
                            const fpy =
                              m.first_pass_yield != null
                                ? `${(m.first_pass_yield * 100).toFixed(0)}%`
                                : "—";
                            return (
                              <tr key={m.id}>
                                <td className="py-1.5 pr-3 font-mono">
                                  {m.periodo ?? m.data_snapshot.slice(0, 7)}
                                </td>
                                <td className="py-1.5 pr-3">
                                  {m.inspecoes_executadas}/{m.inspecoes_planejadas}
                                </td>
                                <td className="py-1.5 pr-3">{fpy}</td>
                                <td className="py-1.5 pr-3">
                                  {m.ncs_abertas}/{m.ncs_encerradas}
                                </td>
                                <td className="py-1.5 pr-3">
                                  {m.ncs_criticas_abertas > 0 ? (
                                    <span className="rounded bg-red-500/10 px-1.5 text-red-700">
                                      {m.ncs_criticas_abertas}
                                    </span>
                                  ) : (
                                    "0"
                                  )}
                                </td>
                                <td className="py-1.5 pr-3">
                                  {m.tempo_medio_encerramento_dias != null
                                    ? m.tempo_medio_encerramento_dias.toFixed(0)
                                    : "—"}
                                </td>
                                <td className="py-1.5 pr-3">
                                  {m.conformidade_media_pct != null
                                    ? `${m.conformidade_media_pct.toFixed(1)}%`
                                    : "—"}
                                </td>
                                <td className="py-1.5 pr-3 font-mono">
                                  {fmtBRL(m.custo_nao_qualidade)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                <p className="font-semibold text-amber-700">Roteiro M5 completo</p>
                <p className="mt-1 text-muted-foreground">
                  Dashboard agregado acima. CRUD detalhado de Requisitos, Inspeções, NCs
                  (com 5-Why) e Auditorias nas páginas filhas — a criar em{" "}
                  <code className="rounded bg-muted px-1">/projetos/{id}/qualidade</code>.
                </p>
              </div>
            </>
          )}
        </TabsContent>

        {/* ====== AQUISIÇÕES (M9 PMBoK §12) ====== */}
        <TabsContent value="aquisicoes" className="pt-3 space-y-3">
          {!procurement ? (
            <p className="text-xs text-muted-foreground">Carregando métricas de aquisições…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Mini
                  label="Valor contratado"
                  value={fmtBRL(procurement.kpis.valor_contratado_total)}
                  accent="#0f766e"
                />
                <Mini
                  label="Valor realizado"
                  value={fmtBRL(procurement.kpis.valor_realizado_contratos)}
                  accent="#16a34a"
                />
                <Mini
                  label="Aditivos"
                  value={`${fmtBRL(procurement.kpis.valor_aditivos_total)} (${(procurement.kpis.pct_aditivos_sobre_original * 100).toFixed(1)}%)`}
                  accent={procurement.kpis.pct_aditivos_sobre_original > 0.05 ? "#dc2626" : "#f59e0b"}
                />
                <Mini
                  label="Long-lead"
                  value={`${procurement.kpis.pos_long_lead} POs (${fmtBRL(procurement.kpis.valor_long_lead)})`}
                  accent="#a855f7"
                />
                <Mini
                  label="Ciclo RFP (real/padrão)"
                  value={
                    procurement.kpis.ciclo_medio_real_dias != null
                      ? `${procurement.kpis.ciclo_medio_real_dias.toFixed(0)}/${procurement.kpis.ciclo_padrao_dias}d`
                      : `—/${procurement.kpis.ciclo_padrao_dias}d`
                  }
                  accent={
                    (procurement.kpis.ciclo_medio_real_dias ?? 0) <= procurement.kpis.ciclo_padrao_dias
                      ? "#16a34a"
                      : "#f59e0b"
                  }
                />
                <Mini
                  label="Aderência prazo RFP"
                  value={
                    procurement.kpis.aderencia_prazo_rfp != null
                      ? `${(procurement.kpis.aderencia_prazo_rfp * 100).toFixed(0)}%`
                      : "—"
                  }
                  accent={
                    (procurement.kpis.aderencia_prazo_rfp ?? 0) >= 0.8
                      ? "#16a34a"
                      : (procurement.kpis.aderencia_prazo_rfp ?? 0) >= 0.5
                      ? "#f59e0b"
                      : "#dc2626"
                  }
                />
                <Mini
                  label="Fornecedores"
                  value={`${procurement.kpis.fornecedores_homologados}/${procurement.kpis.fornecedores_total}`}
                  accent="#0ea5e9"
                />
                <Mini
                  label="Marcos em risco/atraso"
                  value={String(procurement.kpis.marcos_em_risco + procurement.kpis.marcos_atrasados)}
                  accent={
                    procurement.kpis.marcos_em_risco + procurement.kpis.marcos_atrasados > 0
                      ? "#dc2626"
                      : undefined
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Contratos em execução</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {procurement.kpis.contratos_em_execucao} de {procurement.kpis.contratos_total} totais.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {contratos.map((c) => (
                      <div
                        key={c.id}
                        className="rounded border border-border p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {c.codigo}
                          </span>
                          <span className="flex-1 truncate font-medium">{c.titulo}</span>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              backgroundColor:
                                c.status === "concluido"
                                  ? "#dcfce7"
                                  : c.status === "em_execucao"
                                  ? "#dbeafe"
                                  : "#fef3c7",
                              color:
                                c.status === "concluido"
                                  ? "#15803d"
                                  : c.status === "em_execucao"
                                  ? "#1d4ed8"
                                  : "#b45309",
                            }}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="mt-1 grid grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                          <span>{c.fornecedor_codigo}</span>
                          <span>{fmtBRL(c.valor_total)}</span>
                          <span>{c.percentual_executado}% físico</span>
                          <span>{(c.percentual_valor_executado * 100).toFixed(0)}% financeiro</span>
                        </div>
                        {c.qtd_aditivos > 0 && (
                          <p className="mt-1 text-[10px] text-amber-700">
                            {c.qtd_aditivos} aditivo(s) totalizando {fmtBRL(c.valor_aditivos)}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Marcos de suprimentos</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Long-leads, LOAs antecipadas e mobilizações.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {marcosSup.map((m) => (
                      <div
                        key={m.id}
                        className="rounded border border-border p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {m.codigo}
                          </span>
                          <span className="flex-1 truncate">{m.titulo}</span>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              backgroundColor:
                                m.status === "atingido"
                                  ? "#dcfce7"
                                  : m.status === "em_risco"
                                  ? "#fef3c7"
                                  : m.status === "atrasado"
                                  ? "#fee2e2"
                                  : "#f1f5f9",
                              color:
                                m.status === "atingido"
                                  ? "#15803d"
                                  : m.status === "em_risco"
                                  ? "#b45309"
                                  : m.status === "atrasado"
                                  ? "#b91c1c"
                                  : "#475569",
                            }}
                          >
                            {m.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                          <span>Plan: {m.data_planejada ?? "—"}</span>
                          <span>Real: {m.data_real ?? "—"}</span>
                          {m.desvio_dias != null && (
                            <span className={m.desvio_dias > 0 ? "text-red-600" : "text-green-600"}>
                              {m.desvio_dias > 0 ? `+${m.desvio_dias}d` : `${m.desvio_dias}d`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">RFPs — ciclo real vs. padrão (150d)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="border-b">
                        <tr className="text-left text-muted-foreground">
                          <th className="py-1.5 pr-3">Código</th>
                          <th className="py-1.5 pr-3">Título</th>
                          <th className="py-1.5 pr-3">Status</th>
                          <th className="py-1.5 pr-3">Vencedor</th>
                          <th className="py-1.5 pr-3">Valor adj.</th>
                          <th className="py-1.5 pr-3">Ciclo real</th>
                          <th className="py-1.5 pr-3">Δ vs 150d</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rfps.map((r) => {
                          const delta =
                            r.ciclo_real_dias != null
                              ? r.ciclo_real_dias - r.prazo_padrao_dias
                              : null;
                          return (
                            <tr key={r.id}>
                              <td className="py-1.5 pr-3 font-mono">{r.codigo}</td>
                              <td className="py-1.5 pr-3">{r.titulo}</td>
                              <td className="py-1.5 pr-3">{r.status.replace("_", " ")}</td>
                              <td className="py-1.5 pr-3">{r.vencedor_razao ?? "—"}</td>
                              <td className="py-1.5 pr-3 font-mono">
                                {fmtBRL(r.valor_adjudicado)}
                              </td>
                              <td className="py-1.5 pr-3">
                                {r.ciclo_real_dias != null ? `${r.ciclo_real_dias}d` : "—"}
                              </td>
                              <td
                                className={
                                  "py-1.5 pr-3 " +
                                  (delta == null
                                    ? ""
                                    : delta > 0
                                    ? "text-red-600"
                                    : "text-green-600")
                                }
                              >
                                {delta == null
                                  ? "—"
                                  : delta > 0
                                  ? `+${delta}d`
                                  : `${delta}d`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ====== MATRIZ RISCOS × WBS ====== */}
        <TabsContent value="matriz-riscos" className="pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Riscos por pacote WBS</CardTitle>
              <p className="text-xs text-muted-foreground">
                Cada risco do projeto é vinculado a um nó da WBS pela heurística inicial —
                edite nos detalhes do risco se necessário.
              </p>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {wbsMatriz
                .filter((i) => i.n_riscos > 0)
                .sort((a, b) => b.n_riscos - a.n_riscos)
                .map((i) => (
                  <div
                    key={i.id}
                    className="rounded border border-border p-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {i.codigo_wbs}
                      </span>
                      <span className="flex-1 font-medium">{i.nome}</span>
                      <span className="rounded bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-700">
                        {i.n_riscos} risco(s)
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 pl-2">
                      {i.riscos.slice(0, 10).map((r) => (
                        <Link
                          key={r.id}
                          href={`/gestao-riscos/riscos/${r.id}`}
                          className="inline-flex items-center gap-1 rounded border border-border bg-muted/20 px-2 py-0.5 text-[10px] hover:border-primary/50"
                        >
                          <span className="font-mono">{r.codigo}</span>
                          <ClassificacaoBadge value={r.classificacao_residual} />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== CRs ====== */}
        <TabsContent value="crs" className="space-y-2 pt-3">
          {crs.map((cr) => (
            <Card key={cr.id}>
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{cr.codigo}</span>
                  <span className="font-medium">{cr.titulo}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      cr.status === "aprovada"
                        ? "bg-green-500/20 text-green-700"
                        : cr.status === "rejeitada"
                        ? "bg-red-500/20 text-red-700"
                        : cr.status === "em_analise" || cr.status === "aberta"
                        ? "bg-yellow-500/20 text-yellow-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cr.status.replace("_", " ")}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] capitalize">
                    {cr.categoria}
                  </span>
                </div>
                {cr.descricao && (
                  <p className="mt-1 text-xs text-muted-foreground">{cr.descricao}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
                  {cr.impacto_cronograma_dias != null && (
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-700">
                      ⏱ +{cr.impacto_cronograma_dias} dias
                    </span>
                  )}
                  {cr.impacto_custo != null && (
                    <span className="rounded bg-red-500/10 px-2 py-0.5 text-red-700">
                      💰 {fmtBRL(cr.impacto_custo)}
                    </span>
                  )}
                  {cr.solicitante_nome && (
                    <span className="text-muted-foreground">por {cr.solicitante_nome}</span>
                  )}
                  <span className="text-muted-foreground">
                    abertura: {cr.data_abertura}
                  </span>
                  {cr.data_decisao && (
                    <span className="text-muted-foreground">
                      decisão: {cr.data_decisao}
                    </span>
                  )}
                </div>
                {cr.decisao && (
                  <p className="mt-1 rounded bg-muted/30 p-2 text-xs">
                    <strong>Decisão:</strong> {cr.decisao}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ====== DECISÕES ====== */}
        <TabsContent value="decisoes" className="space-y-2 pt-3">
          {decisoes.map((d) => (
            <Card key={d.id}>
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{d.codigo}</span>
                  <span className="font-medium">{d.titulo}</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px]">
                    {d.data_decisao}
                  </span>
                </div>
                {d.contexto && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <strong>Contexto:</strong> {d.contexto}
                  </p>
                )}
                {d.alternativas_consideradas && (
                  <p className="mt-1 whitespace-pre-line text-xs">
                    <strong>Alternativas:</strong>
                    {"\n"}
                    {d.alternativas_consideradas}
                  </p>
                )}
                <p className="mt-1 rounded bg-green-500/10 p-2 text-xs">
                  <strong>Decisão:</strong> {d.decisao}
                </p>
                {d.rationale && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <strong>Rationale:</strong> {d.rationale}
                  </p>
                )}
                {d.impactos && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <strong>Impactos:</strong> {d.impactos}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {d.decisor_nome && <span>👤 {d.decisor_nome}</span>}
                  {d.forum && <span>🏛 {d.forum}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CharterSection({ title, text }: { title: string; text?: string | null }) {
  if (!text) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}

function WBSNodeRow({ node, depth }: { node: WBSNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const corExecutor = node.executor ? EXECUTOR_COR[node.executor] : undefined;
  const fmtBRL = (v?: number | null) =>
    v == null
      ? "—"
      : new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
          notation: "compact",
        }).format(v);
  const duracaoMeses =
    node.duracao_dias_estimada != null ? Math.round(node.duracao_dias_estimada / 30) : null;

  return (
    <div>
      <div
        className={`flex items-start gap-2 rounded border border-border p-2 text-xs hover:bg-muted/20 ${
          node.is_marco
            ? "bg-amber-500/5 border-amber-500/30"
            : node.is_critico
            ? "border-red-500/30"
            : ""
        }`}
        style={{ marginLeft: depth * 16 }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-muted-foreground"
          >
            {expanded ? "▼" : "▶"}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">
          {node.codigo_wbs}
        </span>
        <span className="flex-1 font-medium">
          {node.nome}
          {node.is_marco && (
            <span className="ml-1 rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold text-white">
              MARCO
            </span>
          )}
          {node.is_critico && !node.is_marco && (
            <span className="ml-1 rounded bg-red-500 px-1 py-0.5 text-[9px] font-bold text-white">
              CRÍTICO
            </span>
          )}
          {node.is_long_lead && (
            <span className="ml-1 rounded bg-purple-500 px-1 py-0.5 text-[9px] font-bold text-white">
              LONG-LEAD
            </span>
          )}
          {node.is_terceirizado && (
            <span className="ml-1 rounded bg-orange-500 px-1 py-0.5 text-[9px] font-bold text-white">
              TERCEIRO
            </span>
          )}
        </span>
        {node.disciplina_epcm && (
          <span
            className="shrink-0 rounded px-1 text-[9px] font-bold text-white"
            style={{ backgroundColor: EPCM_COR[node.disciplina_epcm] ?? "#64748b" }}
          >
            {node.disciplina_epcm}
          </span>
        )}
        {node.executor && (
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
            style={{ backgroundColor: (corExecutor ?? "#64748b") + "22", color: corExecutor }}
          >
            {node.executor}
          </span>
        )}
        {node.is_servico_contratado && (
          <span
            className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
            title={`Ciclo ${node.ciclo_suprimentos_dias}d suprim + ${node.ciclo_mobilizacao_dias}d mob`}
          >
            150+45d
          </span>
        )}
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {duracaoMeses ? `${duracaoMeses}m` : ""}
        </span>
        <span className="shrink-0 w-24 text-right font-mono text-[10px] text-muted-foreground">
          {fmtBRL(node.orcamento_estimado)}
        </span>
      </div>
      {expanded &&
        hasChildren &&
        node.children!.map((c) => <WBSNodeRow key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm font-semibold" style={{ color: accent }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function EVMKpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold" style={{ color: accent }}>
          {value}
        </div>
        {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function fmtBRL(v?: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(v);
}
