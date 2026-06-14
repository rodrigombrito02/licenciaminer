"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, Target, Building2, Cpu, Activity, Swords, BatteryWarning, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  solApi, MODALIDADE_LABEL, HEALTH_COLOR,
  type SolMeta, type SolKpis, type Negocio, type ClienteServico, type Frota, type CSRelatorio,
  type ContratosResp,
} from "@/lib/sqsolucoes-api";

function brl(v: number | null | undefined): string {
  if (!v) return "—";
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}k`;
  return `R$ ${v}`;
}

const STATUS_DEV: Record<string, string> = {
  ativo: "bg-green-100 text-green-800", offline: "bg-red-100 text-red-700",
  manutencao: "bg-amber-100 text-amber-800", inativo: "bg-gray-100 text-gray-600",
};

export function SQSolucoesCockpit() {
  const [meta, setMeta] = useState<SolMeta | null>(null);
  const [kpis, setKpis] = useState<SolKpis | null>(null);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [clientes, setClientes] = useState<ClienteServico[]>([]);
  const [frota, setFrota] = useState<Frota | null>(null);
  const [contratos, setContratos] = useState<ContratosResp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, k, n, c, f, ct] = await Promise.all([
        solApi.meta(), solApi.kpis(), solApi.negocios(), solApi.clientes(), solApi.frota(), solApi.contratos(),
      ]);
      setMeta(m); setKpis(k); setNegocios(n); setClientes(c); setFrota(f); setContratos(ct);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-brand-orange" /></div>;

  return (
    <div className="space-y-5">
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPI label="Pipeline ponderado" value={brl(kpis.pipeline_ponderado)} color="#E67E22" />
          <KPI label="MRR" value={brl(kpis.mrr)} color="#27AE60" />
          <KPI label="Faturando" value={kpis.faturando} color="#156082" />
          <KPI label="Clientes" value={kpis.clientes} color="#0A2540" />
          <KPI label="Dispositivos" value={kpis.dispositivos} color="#7B1FA2" />
        </div>
      )}

      <Tabs defaultValue="pipeline">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="pipeline" className="gap-1.5 text-xs"><Target className="h-3.5 w-3.5" />Pipeline SST</TabsTrigger>
          <TabsTrigger value="contratos" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Contratos & MRR</TabsTrigger>
          <TabsTrigger value="clientes" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Clientes & Implantações</TabsTrigger>
          <TabsTrigger value="frota" className="gap-1.5 text-xs"><Cpu className="h-3.5 w-3.5" />Frota</TabsTrigger>
          <TabsTrigger value="parceiros" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" />Parceiros</TabsTrigger>
          <TabsTrigger value="concorrentes" className="gap-1.5 text-xs"><Swords className="h-3.5 w-3.5" />Concorrentes</TabsTrigger>
        </TabsList>

        {/* Pipeline */}
        <TabsContent value="pipeline" className="pt-4">
          <div className="space-y-1.5">
            {negocios.map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{n.conta}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {n.parceiro && <Badge variant="secondary" className="text-[9px]">{n.parceiro}</Badge>}
                    {n.modalidade && <Badge variant="outline" className="text-[9px]">{MODALIDADE_LABEL[n.modalidade] ?? n.modalidade}</Badge>}
                    {n.proximo_passo && <span className="text-[10px] text-muted-foreground truncate max-w-[260px]">→ {n.proximo_passo}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className="text-[9px]">{n.fase} · {n.probabilidade}%</Badge>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{brl(n.ticket_base)} {n.mrr ? `· ${brl(n.mrr)}/m` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Contratos & MRR */}
        <TabsContent value="contratos" className="pt-4">
          {contratos && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <KPI label="Contratos ativos" value={contratos.total} color="#0A2540" />
                <KPI label="MRR recorrente" value={brl(contratos.mrr_total)} color="#27AE60" />
                <KPI label="ARR projetado" value={brl(contratos.arr_projetado)} color="#E67E22" />
              </div>
              <div className="space-y-1.5">
                {contratos.contratos.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.cliente}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <Badge variant="outline" className="text-[9px]">{contratos.modelos[c.modelo] ?? c.modelo}</Badge>
                        {c.solucao && <Badge variant="secondary" className="text-[9px]">{c.solucao}</Badge>}
                        {c.parceiro && <span className="text-[10px] text-muted-foreground">via {c.parceiro}</span>}
                        {c.responsavel && <span className="text-[10px] text-muted-foreground">· {c.responsavel}</span>}
                      </div>
                      {c.notas && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.notas}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className={`text-[9px] ${STATUS_DEV[c.status === "encerrado" ? "inativo" : c.status === "pausado" ? "manutencao" : "ativo"] ?? ""}`}>{c.status}</Badge>
                      <p className="text-[11px] font-medium mt-0.5">{c.mensalidade ? `${brl(c.mensalidade)}/m` : "—"}</p>
                      {c.vigencia_meses ? <p className="text-[10px] text-muted-foreground">{c.vigencia_meses}m · início {c.inicio ?? "—"}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">MRR = soma das mensalidades de contratos ativos. ARR projetado = MRR × 12.</p>
            </>
          )}
        </TabsContent>

        {/* Clientes & Implantações */}
        <TabsContent value="clientes" className="pt-4 space-y-3">
          {clientes.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">{c.nome}</h4>
                    <p className="text-[11px] text-muted-foreground">{c.setor} · {(c.unidades ?? []).join(", ")}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px]">{c.n_dispositivos} devices</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {c.implantacoes.map((i) => (
                    <div key={i.id} className="rounded-lg border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{i.titulo}</p>
                        {i.health && <Badge variant="outline" className={`text-[9px] ${HEALTH_COLOR[i.health] ?? ""}`}>CS {i.health}</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {i.parceiro && <Badge variant="secondary" className="text-[9px]">{i.parceiro}</Badge>}
                        {i.modalidade && <Badge variant="outline" className="text-[9px]">{MODALIDADE_LABEL[i.modalidade] ?? i.modalidade}</Badge>}
                        <Badge variant="outline" className="text-[9px]">fase: {i.fase}</Badge>
                        {i.adocao_pct != null && <span className="text-[10px] text-muted-foreground">adoção {i.adocao_pct}%</span>}
                      </div>
                      {i.notas && <p className="text-[11px] text-muted-foreground mt-1">{i.notas}</p>}
                      <CSRelatorioInline implantacaoId={i.id} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Frota */}
        <TabsContent value="frota" className="pt-4">
          {frota && (
            <>
              <div className="flex gap-2 mb-3 flex-wrap">
                {Object.entries(frota.por_status).map(([s, n]) => (
                  <Badge key={s} variant="outline" className={`text-[10px] ${STATUS_DEV[s] ?? ""}`}>{s}: {n}</Badge>
                ))}
              </div>
              <div className="space-y-1.5">
                {frota.dispositivos.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg border p-2 text-xs">
                    <Badge variant="secondary" className="text-[9px] shrink-0">{d.tipo}</Badge>
                    <span className="font-mono">{d.serial}</span>
                    <span className="text-muted-foreground flex-1 truncate">{d.unidade}</span>
                    {d.bateria != null && (
                      <span className={`flex items-center gap-0.5 ${d.bateria < 25 ? "text-destructive" : "text-muted-foreground"}`}>
                        {d.bateria < 25 && <BatteryWarning className="h-3 w-3" />}{d.bateria}%
                      </span>
                    )}
                    <span className="text-muted-foreground">{d.ultima_comunicacao}</span>
                    <Badge variant="outline" className={`text-[9px] ${STATUS_DEV[d.status] ?? ""}`}>{d.status}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">Dados ilustrativos — telemetria ao vivo via Integração de Plataformas (INT-B1).</p>
            </>
          )}
        </TabsContent>

        {/* Parceiros */}
        <TabsContent value="parceiros" className="pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {meta?.parceiros.map((p) => (
              <Card key={p.slug}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">{p.nome}</h4>
                    <Badge variant="outline" className="text-[9px]">{MODALIDADE_LABEL[p.modalidade] ?? p.modalidade}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{p.produto}</p>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-muted-foreground">âncora: {p.ancora}</span>
                    <Badge variant="secondary" className="text-[9px]">{p.maturidade}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Concorrentes */}
        <TabsContent value="concorrentes" className="pt-4 space-y-2">
          {meta?.concorrentes.map((c) => (
            <Card key={c.nome}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm">{c.nome}</h4>
                  <Badge variant="outline" className="text-[9px]">{c.categoria}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{c.oferta}</p>
                <p className="text-[11px] mt-1"><span className="font-semibold text-brand-teal">Diferencial SQ:</span> {c.diferencial_sq}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CSRelatorioInline({ implantacaoId }: { implantacaoId: number }) {
  const [open, setOpen] = useState(false);
  const [rel, setRel] = useState<CSRelatorio | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!rel) {
      setLoading(true);
      try { setRel(await solApi.cs(implantacaoId)); } finally { setLoading(false); }
    }
  }

  return (
    <div className="mt-2 border-t pt-2">
      <button onClick={toggle} className="text-[11px] font-medium text-brand-teal hover:underline">
        {open ? "▾" : "▸"} Relatório de Customer Success
      </button>
      {open && (
        loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mt-1" /> : rel && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              {rel.ciclo.map((c, i) => (
                <span key={c} className="flex items-center gap-1">
                  <span className="rounded bg-brand-teal/10 text-brand-teal px-1.5 py-0.5">{c}</span>
                  {i < rel.ciclo.length - 1 && <span className="text-muted-foreground/40">→</span>}
                </span>
              ))}
            </div>
            <table className="w-full text-[11px]">
              <thead><tr className="text-muted-foreground"><th className="text-left font-medium">KPI de impacto</th><th className="text-right font-medium">Baseline</th><th className="text-right font-medium">Atual</th></tr></thead>
              <tbody>
                {rel.kpis_impacto.map((k) => (
                  <tr key={k.kpi} className="border-t">
                    <td className="py-1">{k.kpi}</td>
                    <td className="text-right text-muted-foreground">{k.baseline ?? "—"}</td>
                    <td className="text-right text-muted-foreground">{k.atual ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-muted-foreground/70 italic">{rel.nota}</p>
          </div>
        )
      )}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <CardContent className="p-3">
        <div className="text-xl font-bold" style={{ color }}>{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
