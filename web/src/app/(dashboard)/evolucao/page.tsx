"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GitBranch,
  Loader2,
  Plus,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Lightbulb,
  CheckCircle2,
  Layers,
  Package,
  Paperclip,
  Upload,
  Download,
  LayoutGrid,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleHero } from "@/components/module-hero";
import { RoleGate } from "@/components/role-gate";
import { useRole } from "@/hooks/use-role";
import {
  evApi,
  STATUS_LABEL,
  NIVEL_LABEL,
  ORIGEM_LABEL,
  type EvItem,
  type EvMeta,
  type EvResumo,
} from "@/lib/evolucao-api";

const NIVEIS = ["anonimo", "visitante_free", "visitante_pago", "consultor", "admin"];

const STATUS_COLOR: Record<string, string> = {
  proposta: "bg-gray-100 text-gray-700 border-gray-200",
  aprovada: "bg-blue-100 text-blue-800 border-blue-200",
  em_dev: "bg-amber-100 text-amber-800 border-amber-200",
  entregue: "bg-teal-100 text-teal-800 border-teal-200",
  validada: "bg-green-100 text-green-800 border-green-200",
  recusada: "bg-red-100 text-red-700 border-red-200",
  no_ar: "bg-green-100 text-green-800 border-green-200",
  em_breve: "bg-violet-100 text-violet-700 border-violet-200",
  em_sprint: "bg-amber-100 text-amber-800 border-amber-200",
  ideia: "bg-gray-100 text-gray-600 border-gray-200",
  nova: "bg-gray-100 text-gray-700 border-gray-200",
  em_avaliacao: "bg-amber-100 text-amber-800 border-amber-200",
  aprovado: "bg-green-100 text-green-800 border-green-200",
  reprovado: "bg-red-100 text-red-700 border-red-200",
};

const SPRINT_COLS = ["proposta", "aprovada", "em_dev", "entregue", "validada"];

export default function EvolucaoPage() {
  return (
    <RoleGate
      minRole="consultor"
      fallback={
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <GitBranch className="h-10 w-10 text-brand-teal mx-auto" />
            <h3 className="font-bold">Área interna Summo</h3>
            <p className="text-sm text-muted-foreground">
              O acompanhamento da evolução do sistema é interno (consultor/admin).
            </p>
          </CardContent>
        </Card>
      }
    >
      <EvolucaoInner />
    </RoleGate>
  );
}

function EvolucaoInner() {
  const role = useRole();
  const meuNome = role.status === "authenticated" ? role.nome : "Anônimo";

  const [itens, setItens] = useState<EvItem[]>([]);
  const [meta, setMeta] = useState<EvMeta | null>(null);
  const [resumo, setResumo] = useState<EvResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<EvItem | null>(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    try {
      const [its, m, r] = await Promise.all([evApi.listar(), evApi.meta(), evApi.resumo()]);
      setItens(its);
      setMeta(m);
      setResumo(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const funcionalidades = useMemo(() => itens.filter((i) => i.tipo === "funcionalidade"), [itens]);
  const sprints = useMemo(() => itens.filter((i) => i.tipo === "sprint"), [itens]);
  const sugestoes = useMemo(() => itens.filter((i) => i.tipo === "sugestao"), [itens]);
  const produtos = useMemo(() => itens.filter((i) => i.tipo === "produto"), [itens]);

  async function abrir(id: number) {
    const full = await evApi.obter(id);
    setAberto(full);
  }

  return (
    <div className="space-y-6">
      <ModuleHero
        icon={GitBranch}
        badge="Plataforma · Interno"
        title="Evolução do Sistema"
        description="O plano de evolução vive aqui. Funcionalidades no ar (com a matriz de visibilidade), sprints em andamento e sugestões de melhoria — para o time avaliar, comentar e aprovar."
        variant="navy"
      />

      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Funcionalidades no ar" value={resumo.por_status.no_ar ?? 0} color="#27AE60" />
          <KPI label="Sprints entregues" value={resumo.por_status.entregue ?? 0} color="#156082" />
          <KPI label="No roadmap" value={resumo.por_status.proposta ?? 0} color="#0A2540" />
          <KPI label="Sugestões abertas" value={resumo.por_status.nova ?? 0} color="#FFC000" />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
        </div>
      ) : (
        <Tabs defaultValue="sprints">
          <TabsList>
            <TabsTrigger value="mapa">
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Mapa do Sistema
            </TabsTrigger>
            <TabsTrigger value="funcionalidades">
              <Layers className="h-3.5 w-3.5 mr-1.5" /> Funcionalidades
            </TabsTrigger>
            <TabsTrigger value="sprints">
              <GitBranch className="h-3.5 w-3.5 mr-1.5" /> Monitor de Sprints
            </TabsTrigger>
            <TabsTrigger value="sugestoes">
              <Lightbulb className="h-3.5 w-3.5 mr-1.5" /> Sugestões
            </TabsTrigger>
            <TabsTrigger value="produtos">
              <Package className="h-3.5 w-3.5 mr-1.5" /> Produtos &amp; Ideias
            </TabsTrigger>
          </TabsList>

          {/* ── Mapa do Sistema (matriz módulo × visão) ── */}
          <TabsContent value="mapa" className="pt-4">
            <MapaDoSistema funcionalidades={funcionalidades} />
          </TabsContent>

          {/* ── Funcionalidades por módulo ── */}
          <TabsContent value="funcionalidades" className="space-y-5 pt-4">
            {agrupar(funcionalidades).map(([modulo, items]) => (
              <div key={modulo}>
                <h3 className="font-bold text-sm text-brand-navy mb-2">{modulo}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((it) => (
                    <Card key={it.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => abrir(it.id)}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          {it.status === "em_breve" ? (
                            <Clock className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          )}
                          <h4 className="font-semibold text-xs leading-tight">{it.titulo}</h4>
                          {it.status !== "no_ar" && (
                            <Badge variant="outline" className={`text-[8px] shrink-0 ${STATUS_COLOR[it.status] ?? ""}`}>{STATUS_LABEL[it.status] ?? it.status}</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{it.descricao}</p>
                        <VisMatrix vis={it.visibilidade} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ── Sprints kanban ── */}
          <TabsContent value="sprints" className="pt-4">
            <div className="flex justify-end mb-3">
              <NovoItemDialog tipo="sprint" meta={meta} autor={meuNome} onCriado={recarregar} />
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 min-w-max">
                {SPRINT_COLS.map((st) => {
                  const col = sprints.filter((s) => s.status === st);
                  return (
                    <div key={st} className="w-64 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="font-bold text-xs uppercase tracking-wider">{STATUS_LABEL[st]}</h3>
                        <Badge variant="secondary" className="text-[10px]">{col.length}</Badge>
                      </div>
                      <div className="space-y-2 min-h-[80px]">
                        {col.map((it) => (
                          <Card key={it.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => abrir(it.id)}>
                            <CardContent className="p-3 space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                <Badge variant="outline" className="text-[9px]">{it.modulo}</Badge>
                                {it.fase && <span className="text-[9px] text-muted-foreground">F{it.fase}</span>}
                              </div>
                              <h4 className="font-semibold text-xs leading-tight">{it.titulo}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                {it.n_comentarios > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{it.n_comentarios}</span>}
                                {it.votos_aprovar > 0 && <span className="flex items-center gap-0.5 text-success"><ThumbsUp className="h-2.5 w-2.5" />{it.votos_aprovar}</span>}
                                {it.votos_reprovar > 0 && <span className="flex items-center gap-0.5 text-destructive"><ThumbsDown className="h-2.5 w-2.5" />{it.votos_reprovar}</span>}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {col.length === 0 && (
                          <div className="border-2 border-dashed border-muted-foreground/15 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-muted-foreground/50">vazio</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ── Sugestões ── */}
          <TabsContent value="sugestoes" className="space-y-2 pt-4">
            <div className="flex justify-end mb-1">
              <NovoItemDialog tipo="sugestao" meta={meta} autor={meuNome} onCriado={recarregar} />
            </div>
            {sugestoes.map((it) => (
              <Card key={it.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => abrir(it.id)}>
                <CardContent className="p-3 flex items-start gap-3">
                  <Lightbulb className="h-4 w-4 text-brand-gold shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{it.titulo}</h4>
                      <Badge variant="outline" className={`text-[9px] ${STATUS_COLOR[it.status] ?? ""}`}>{STATUS_LABEL[it.status] ?? it.status}</Badge>
                      {it.origem && <Badge variant="secondary" className="text-[9px]">{ORIGEM_LABEL[it.origem] ?? it.origem}{it.origem_detalhe ? `: ${it.origem_detalhe}` : ""}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{it.descricao}</p>
                  </div>
                  {it.modulo && <Badge variant="outline" className="text-[9px] shrink-0">{it.modulo}</Badge>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Produtos & Ideias (avaliação do Lima) ── */}
          <TabsContent value="produtos" className="space-y-3 pt-4">
            <div className="rounded-lg border border-brand-teal/30 bg-brand-teal/5 p-3 flex items-start justify-between gap-3 flex-wrap">
              <p className="text-xs text-muted-foreground flex-1 min-w-[240px]">
                Produtos de <strong>SQ Mineral Intelligence</strong> propostos para avaliação.
                Abra cada um, leia o descritivo, <strong>aprove ou reprove</strong> com feedback.
                Tem uma ideia nova? Crie aqui e anexe arquivos.
              </p>
              <NovoItemDialog tipo="produto" meta={meta} autor={meuNome} onCriado={recarregar} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {produtos.map((it) => (
                <Card key={it.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => abrir(it.id)}>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm leading-tight">{it.titulo}</h4>
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${STATUS_COLOR[it.status] ?? ""}`}>{STATUS_LABEL[it.status] ?? it.status}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{(it.descricao ?? "").replace(/\*\*/g, "")}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                      {it.votos_aprovar > 0 && <span className="flex items-center gap-0.5 text-success"><ThumbsUp className="h-2.5 w-2.5" />{it.votos_aprovar}</span>}
                      {it.votos_reprovar > 0 && <span className="flex items-center gap-0.5 text-destructive"><ThumbsDown className="h-2.5 w-2.5" />{it.votos_reprovar}</span>}
                      {it.n_comentarios > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{it.n_comentarios}</span>}
                      {(it.n_anexos ?? 0) > 0 && <span className="flex items-center gap-0.5"><Paperclip className="h-2.5 w-2.5" />{it.n_anexos}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {aberto && (
        <DetalheDialog
          item={aberto}
          meta={meta}
          autor={meuNome}
          onClose={() => setAberto(null)}
          onChange={async () => {
            await recarregar();
            const full = await evApi.obter(aberto.id);
            setAberto(full);
          }}
        />
      )}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <CardContent className="p-4">
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function VisMatrix({ vis }: { vis: string[] }) {
  return (
    <div className="flex gap-1">
      {NIVEIS.map((n) => {
        const on = vis.includes(n);
        return (
          <span
            key={n}
            title={`${NIVEL_LABEL[n]}: ${on ? "vê" : "não vê"}`}
            className={`text-[8px] px-1 py-0.5 rounded border ${
              on ? "bg-brand-teal/15 text-brand-teal border-brand-teal/30 font-semibold" : "bg-muted/40 text-muted-foreground/40 border-transparent"
            }`}
          >
            {NIVEL_LABEL[n]}
          </span>
        );
      })}
    </div>
  );
}

function MapaDoSistema({ funcionalidades }: { funcionalidades: EvItem[] }) {
  const grupos = useMemo(() => agrupar(funcionalidades), [funcionalidades]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-navy/20 bg-brand-navy/5 p-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          Visão consolidada do sistema: cada linha é uma funcionalidade, agrupada por módulo.
          As colunas mostram <strong>quem enxerga cada coisa</strong> nos 5 níveis de acesso.
          O status indica se já está <strong>no ar</strong> ou ainda <strong>em breve</strong> (planejada, estrutura pronta).
        </p>
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> No ar</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-violet-500" /> Em breve</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-brand-teal/20 border border-brand-teal/40" /> Vê</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-muted/40 border border-transparent" /> Não vê</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left font-semibold px-3 py-2 sticky left-0 bg-muted/40 z-10 min-w-[220px]">Funcionalidade</th>
              <th className="text-center font-semibold px-2 py-2 w-20">Status</th>
              {NIVEIS.map((n) => (
                <th key={n} className="text-center font-semibold px-2 py-2 whitespace-nowrap">{NIVEL_LABEL[n]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map(([modulo, items]) => (
              <ModuloRows key={modulo} modulo={modulo} items={items} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModuloRows({ modulo, items }: { modulo: string; items: EvItem[] }) {
  return (
    <>
      <tr className="bg-brand-navy/5">
        <td colSpan={2 + NIVEIS.length} className="px-3 py-1.5 font-bold text-brand-navy text-[11px] uppercase tracking-wider sticky left-0">
          {modulo}
        </td>
      </tr>
      {items.map((it) => (
        <tr key={it.id} className="border-t hover:bg-muted/20">
          <td className="px-3 py-1.5 sticky left-0 bg-background z-10">
            <div className="flex items-center gap-1.5">
              {it.status === "em_breve" ? (
                <Clock className="h-3 w-3 text-violet-500 shrink-0" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
              )}
              <span className="leading-tight">{it.titulo}</span>
            </div>
          </td>
          <td className="px-2 py-1.5 text-center">
            <Badge variant="outline" className={`text-[8px] ${STATUS_COLOR[it.status] ?? ""}`}>{STATUS_LABEL[it.status] ?? it.status}</Badge>
          </td>
          {NIVEIS.map((n) => {
            const on = (it.visibilidade ?? []).includes(n);
            return (
              <td key={n} className="px-2 py-1.5 text-center">
                <span
                  className={`inline-block w-4 h-4 rounded ${
                    on ? "bg-brand-teal/25 border border-brand-teal/50" : "bg-muted/30 border border-transparent"
                  }`}
                  title={on ? "Vê" : "Não vê"}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function agrupar(items: EvItem[]): [string, EvItem[]][] {
  const map = new Map<string, EvItem[]>();
  for (const it of items) {
    const k = it.modulo ?? "Outros";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(it);
  }
  return Array.from(map.entries());
}

function DetalheDialog({
  item, meta, autor, onClose, onChange,
}: {
  item: EvItem;
  meta: EvMeta | null;
  autor: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const statusOpts = meta?.status[item.tipo] ?? [];
  const isProduto = item.tipo === "produto";

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      await evApi.uploadAnexo(item.id, f, autor);
      onChange();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function comentar(voto?: "aprovar" | "reprovar") {
    if (!voto && !texto.trim()) return;
    setBusy(true);
    try {
      await evApi.comentar(item.id, { autor, texto: texto.trim() || undefined, voto });
      setTexto("");
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function mudarStatus(status: string) {
    setBusy(true);
    try {
      await evApi.atualizar(item.id, { status });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function toggleVis(nivel: string) {
    const vis = item.visibilidade.includes(nivel)
      ? item.visibilidade.filter((v) => v !== nivel)
      : [...item.visibilidade, nivel];
    setBusy(true);
    try {
      await evApi.atualizar(item.id, { visibilidade: vis });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{item.titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {item.modulo && <Badge variant="outline">{item.modulo}</Badge>}
            <Badge variant="outline" className={STATUS_COLOR[item.status] ?? ""}>{STATUS_LABEL[item.status] ?? item.status}</Badge>
            {item.fase && <span className="text-muted-foreground">Fase {item.fase}</span>}
          </div>
          {item.descricao && (
            <div className="text-sm text-muted-foreground space-y-1">
              {item.descricao.split("\n").filter((l) => l.trim()).map((linha, i) => (
                <p key={i} dangerouslySetInnerHTML={{
                  __html: linha
                    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
                    .replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground/80'>$1</strong>"),
                }} />
              ))}
            </div>
          )}

          {/* Anexos */}
          <div>
            <label className="text-xs font-semibold mb-1 flex items-center gap-1">
              <Paperclip className="h-3 w-3" /> Arquivos ({item.anexos?.length ?? 0})
            </label>
            <div className="space-y-1 mb-2">
              {(item.anexos ?? []).map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded border p-1.5 text-xs">
                  <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{a.nome_arquivo}</span>
                  <a href={evApi.anexoUrl(a.id)} target="_blank" rel="noreferrer" className="text-brand-teal shrink-0">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
            <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-brand-teal hover:underline">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Anexar arquivo
              <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
            </label>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold block mb-1">Status</label>
            <Select value={item.status} onValueChange={mudarStatus} disabled={busy}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOpts.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{STATUS_LABEL[s] ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibilidade — não se aplica a produtos/ideias */}
          {!isProduto && (
          <div>
            <label className="text-xs font-semibold block mb-1 flex items-center gap-1">
              <Eye className="h-3 w-3" /> Visível para
            </label>
            <div className="flex gap-1 flex-wrap">
              {NIVEIS.map((n) => {
                const on = item.visibilidade.includes(n);
                return (
                  <button
                    key={n}
                    onClick={() => toggleVis(n)}
                    disabled={busy}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                      on ? "bg-brand-teal/15 text-brand-teal border-brand-teal/30 font-semibold" : "bg-muted/40 text-muted-foreground/50 border-transparent hover:border-brand-teal/20"
                    }`}
                  >
                    {NIVEL_LABEL[n]}
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {/* Comentários / Avaliação */}
          <div>
            <label className="text-xs font-semibold block mb-2">
              {isProduto ? "Aprovação & feedback" : "Avaliação do time"} ({item.comentarios?.length ?? 0})
            </label>
            <div className="space-y-2 mb-3">
              {(item.comentarios ?? []).map((c) => (
                <div key={c.id} className="rounded-lg bg-muted/40 p-2">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-semibold">{c.autor ?? "—"}</span>
                    {c.voto === "aprovar" && <ThumbsUp className="h-3 w-3 text-success" />}
                    {c.voto === "reprovar" && <ThumbsDown className="h-3 w-3 text-destructive" />}
                  </div>
                  {c.texto && <p className="text-xs mt-0.5">{c.texto}</p>}
                </div>
              ))}
              {(item.comentarios?.length ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground">Sem avaliações ainda.</p>
              )}
            </div>
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Comentar..."
              className="h-8 text-xs mb-2"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-success" onClick={() => comentar("aprovar")} disabled={busy}>
                <ThumbsUp className="h-3 w-3 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => comentar("reprovar")} disabled={busy}>
                <ThumbsDown className="h-3 w-3 mr-1" /> Reprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => comentar()} disabled={busy || !texto.trim()}>
                Comentar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NovoItemDialog({
  tipo, meta, autor, onCriado,
}: {
  tipo: "sprint" | "sugestao" | "produto";
  meta: EvMeta | null;
  autor: string;
  onCriado: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modulo, setModulo] = useState(tipo === "produto" ? "SQ Mineral Intelligence" : "Plataforma");
  const [saving, setSaving] = useState(false);
  const labelNovo = tipo === "sprint" ? "Novo sprint" : tipo === "produto" ? "Nova ideia" : "Nova sugestão";

  async function salvar() {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await evApi.criar({
        tipo,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        modulo,
        autor,
        ...(tipo === "sugestao" || tipo === "produto" ? { origem: "interno", origem_detalhe: autor } : {}),
      } as Partial<EvItem>);
      setOpen(false);
      setTitulo("");
      setDescricao("");
      onCriado();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className={tipo === "produto" ? "bg-brand-teal text-white hover:bg-brand-teal/90" : ""} variant={tipo === "produto" ? "default" : "outline"} onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3 mr-1" /> {labelNovo}
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{labelNovo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {tipo === "produto" && (
            <p className="text-xs text-muted-foreground">
              Crie sua ideia de produto. Depois de criar, abra-a para anexar arquivos (planilha, PDF) e o Rodrigo dá sequência.
            </p>
          )}
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" />
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" />
          <Select value={modulo} onValueChange={setModulo}>
            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(meta?.modulos ?? []).map((m) => (
                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={salvar} disabled={saving || !titulo.trim()} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90">
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
