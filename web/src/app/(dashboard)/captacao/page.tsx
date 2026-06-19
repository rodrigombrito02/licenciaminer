"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, Loader2, Plus, Trash2, MessageSquarePlus, ArrowRight,
  Building2, Mail, Phone, Target, FileText, ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ModuleHero } from "@/components/module-hero";
import { RoleGate } from "@/components/role-gate";
import { useRole } from "@/hooks/use-role";
import { capApi, type CapDemanda, type CapMeta, type CapKpis } from "@/lib/captacao-api";

export default function CaptacaoPage() {
  return (
    <RoleGate
      minRole="consultor"
      fallback={
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <TrendingUp className="h-10 w-10 text-brand-gold mx-auto" />
            <h3 className="font-bold">Área interna Summo</h3>
            <p className="text-sm text-muted-foreground">
              A captação de demandas é interna (consultor/admin).
            </p>
          </CardContent>
        </Card>
      }
    >
      <CaptacaoInner />
    </RoleGate>
  );
}

function CaptacaoInner() {
  const role = useRole();
  const meuNome = role.status === "authenticated" ? role.nome : "Equipe";

  const [demandas, setDemandas] = useState<CapDemanda[]>([]);
  const [meta, setMeta] = useState<CapMeta | null>(null);
  const [kpis, setKpis] = useState<CapKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [aberta, setAberta] = useState<CapDemanda | null>(null);
  const [filtroFrente, setFiltroFrente] = useState<string>("__all");

  const recarregar = useCallback(async () => {
    setLoading(true);
    try {
      const [ds, m, k] = await Promise.all([capApi.listar(), capApi.meta(), capApi.kpis()]);
      setDemandas(ds);
      setMeta(m);
      setKpis(k);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const visiveis = useMemo(
    () => filtroFrente === "__all" ? demandas : demandas.filter((d) => d.frente === filtroFrente),
    [demandas, filtroFrente],
  );

  async function abrir(id: number) {
    setAberta(await capApi.obter(id));
  }

  return (
    <div className="space-y-6">
      <ModuleHero
        icon={TrendingUp}
        badge="Captação · Interno"
        title="Onde a demanda vira negócio"
        description="Inbox única de leads dos CTAs de todos os produtos. Qualifique, roteie por frente e promova ao Funil quando virar negócio de ativo."
        variant="gold"
      />

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Demandas" value={kpis.total} color="#FFC000" />
          <KPI label="Novas" value={kpis.por_status.novo ?? 0} color="#156082" />
          <KPI label="Ganhos" value={kpis.ganhos} color="#27AE60" />
          <KPI label="Conversão" value={kpis.taxa_conversao != null ? `${kpis.taxa_conversao}%` : "—"} color="#0A2540" />
        </div>
      )}

      {/* Barra de ações */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Frente:</span>
          <Select value={filtroFrente} onValueChange={setFiltroFrente}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all" className="text-xs">Todas</SelectItem>
              {(meta?.frentes ?? []).map((f) => (
                <SelectItem key={f} value={f} className="text-xs">{meta?.frente_labels[f] ?? f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <NovaDemandaDialog meta={meta} autor={meuNome} onCriada={recarregar} />
      </div>

      {/* Kanban por status */}
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-brand-gold" /></div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {(meta?.status ?? []).map((st) => {
              const col = visiveis.filter((d) => d.status === st);
              return (
                <div key={st} className="w-64 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="font-bold text-xs uppercase tracking-wider">{meta?.status_labels[st] ?? st}</h3>
                    <Badge variant="secondary" className="text-[10px]">{col.length}</Badge>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {col.map((d) => (
                      <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => abrir(d.id)}>
                        <CardContent className="p-3 space-y-1.5">
                          <h4 className="font-semibold text-xs leading-tight">{d.titulo}</h4>
                          {d.empresa && <p className="text-[11px] text-muted-foreground truncate">{d.empresa}</p>}
                          <div className="flex items-center gap-1 flex-wrap">
                            {d.origem && <Badge variant="outline" className="text-[8px]">{meta?.origem_labels[d.origem] ?? d.origem}</Badge>}
                            {d.frente && <Badge variant="secondary" className="text-[8px]">{meta?.frente_labels[d.frente] ?? d.frente}</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {d.oportunidade_id && <span className="flex items-center gap-0.5 text-brand-teal"><Target className="h-2.5 w-2.5" />Funil</span>}
                            {d.n_interacoes > 0 && <span>{d.n_interacoes} interações</span>}
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
      )}

      {aberta && meta && (
        <DemandaDialog
          demanda={aberta}
          meta={meta}
          autor={meuNome}
          onClose={() => setAberta(null)}
          onChange={async () => { await recarregar(); setAberta(await capApi.obter(aberta.id)); }}
          onDeleted={async () => { setAberta(null); await recarregar(); }}
        />
      )}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <CardContent className="p-4">
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function DemandaDialog({
  demanda, meta, autor, onClose, onChange, onDeleted,
}: {
  demanda: CapDemanda;
  meta: CapMeta;
  autor: string;
  onClose: () => void;
  onChange: () => void;
  onDeleted: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);

  async function mudarStatus(status: string) {
    setBusy(true);
    try { await capApi.atualizar(demanda.id, { status }); onChange(); } finally { setBusy(false); }
  }
  async function mudarFrente(frente: string) {
    setBusy(true);
    try { await capApi.atualizar(demanda.id, { frente }); onChange(); } finally { setBusy(false); }
  }
  async function comentar() {
    if (!texto.trim()) return;
    setBusy(true);
    try { await capApi.interagir(demanda.id, { autor, texto: texto.trim() }); setTexto(""); onChange(); }
    finally { setBusy(false); }
  }
  async function promover() {
    setBusy(true);
    try { await capApi.promover(demanda.id); onChange(); } finally { setBusy(false); }
  }
  async function deletar() {
    if (!confirm(`Deletar a demanda "${demanda.titulo}"?`)) return;
    setBusy(true);
    try { await capApi.deletar(demanda.id); onDeleted(); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{demanda.titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {demanda.descricao && <p className="text-sm text-muted-foreground">{demanda.descricao}</p>}

          {/* Contato */}
          <div className="space-y-1 text-sm">
            {demanda.empresa && <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{demanda.empresa}{demanda.cnpj ? ` · ${demanda.cnpj}` : ""}</p>}
            {demanda.contato_nome && <p className="text-muted-foreground">{demanda.contato_nome}</p>}
            {demanda.contato_email && <p className="flex items-center gap-2 text-xs"><Mail className="h-3 w-3" />{demanda.contato_email}</p>}
            {demanda.contato_telefone && <p className="flex items-center gap-2 text-xs"><Phone className="h-3 w-3" />{demanda.contato_telefone}</p>}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {demanda.origem && <Badge variant="outline">{meta.origem_labels[demanda.origem] ?? demanda.origem}</Badge>}
          </div>

          {/* Dossiê do prospect — análise + proposta + links integrados (diligências) */}
          {(demanda.analise || demanda.proposta_url || (demanda.links && demanda.links.length > 0)) && (
            <div className="space-y-2 rounded-lg border border-brand-navy/15 bg-brand-navy/[0.03] p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <FileText className="h-3.5 w-3.5 text-brand-navy" /> Dossiê da oportunidade
              </p>
              {demanda.proposta_url && (
                <a href={demanda.proposta_url} target="_blank" rel="noreferrer"
                   className="flex items-center gap-2 rounded-md border border-brand-orange/40 bg-brand-orange/5 px-3 py-2 text-xs font-medium text-brand-orange hover:bg-brand-orange/10">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir proposta comercial
                </a>
              )}
              {demanda.links && demanda.links.filter((l) => l.tipo !== "proposta").length > 0 && (
                <div className="space-y-1">
                  {demanda.links.filter((l) => l.tipo !== "proposta").map((l, idx) =>
                    l.url.startsWith("/") ? (
                      <Link key={idx} href={l.url} className="flex items-center gap-2 text-xs text-brand-teal hover:underline">
                        <ArrowRight className="h-3 w-3 shrink-0" /> {l.label}
                      </Link>
                    ) : (
                      <a key={idx} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-brand-teal hover:underline">
                        <ExternalLink className="h-3 w-3 shrink-0" /> {l.label}
                      </a>
                    ),
                  )}
                </div>
              )}
              {demanda.analise && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-muted-foreground">Análise da oportunidade</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-muted-foreground">{demanda.analise}</pre>
                </details>
              )}
            </div>
          )}

          {/* Status + frente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Status</label>
              <Select value={demanda.status} onValueChange={mudarStatus} disabled={busy}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meta.status.map((s) => <SelectItem key={s} value={s} className="text-xs">{meta.status_labels[s] ?? s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Frente</label>
              <Select value={demanda.frente ?? ""} onValueChange={mudarFrente} disabled={busy}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {meta.frentes.map((f) => <SelectItem key={f} value={f} className="text-xs">{meta.frente_labels[f] ?? f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vínculo com o Funil */}
          {demanda.oportunidade_id ? (
            <Link href="/oportunidades" className="flex items-center gap-2 rounded-md border border-brand-teal/40 bg-brand-teal/5 px-3 py-2 text-xs text-brand-teal">
              <Target className="h-4 w-4" /> Vinculada ao Funil (oportunidade #{demanda.oportunidade_id}) — abrir →
            </Link>
          ) : (
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={promover} disabled={busy}>
              <ArrowRight className="h-3.5 w-3.5 mr-2" /> Promover ao Funil
            </Button>
          )}

          {/* Interações */}
          <div>
            <label className="text-xs font-semibold block mb-2">Interações ({demanda.interacoes.length})</label>
            <div className="space-y-2 mb-3">
              {demanda.interacoes.map((i) => (
                <div key={i.id} className="rounded-lg bg-muted/40 p-2">
                  <p className="text-[11px] font-semibold">{i.autor ?? "—"}</p>
                  {i.texto && <p className="text-xs mt-0.5">{i.texto}</p>}
                </div>
              ))}
              {demanda.interacoes.length === 0 && <p className="text-xs text-muted-foreground">Sem interações ainda.</p>}
            </div>
            <div className="flex gap-2">
              <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Registrar interação…" className="h-8 text-xs"
                onKeyDown={(e) => e.key === "Enter" && comentar()} />
              <Button size="sm" variant="outline" onClick={comentar} disabled={busy || !texto.trim()}>
                <MessageSquarePlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="text-destructive" onClick={deletar} disabled={busy}>
            <Trash2 className="h-3 w-3 mr-1" /> Deletar demanda
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NovaDemandaDialog({
  meta, autor, onCriada,
}: {
  meta: CapMeta | null;
  autor: string;
  onCriada: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [contato, setContato] = useState("");
  const [email, setEmail] = useState("");
  const [origem, setOrigem] = useState("site");
  const [frente, setFrente] = useState("ambiental");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await capApi.criar({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        empresa: empresa.trim() || undefined,
        contato_nome: contato.trim() || undefined,
        contato_email: email.trim() || undefined,
        origem, frente, criado_por: autor,
      });
      setOpen(false);
      setTitulo(""); setDescricao(""); setEmpresa(""); setContato(""); setEmail("");
      onCriada();
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)} className="bg-brand-gold text-brand-navy hover:bg-brand-gold/90">
        <Plus className="h-3 w-3 mr-1" /> Nova demanda
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova demanda</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título / assunto" />
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" />
          <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Empresa" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Contato" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(meta?.origens ?? []).map((o) => <SelectItem key={o} value={o} className="text-xs">{meta?.origem_labels[o] ?? o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={frente} onValueChange={setFrente}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(meta?.frentes ?? []).map((f) => <SelectItem key={f} value={f} className="text-xs">{meta?.frente_labels[f] ?? f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={salvar} disabled={saving || !titulo.trim()} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90">
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Criar demanda
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
