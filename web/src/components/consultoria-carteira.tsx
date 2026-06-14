"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Plus, Trash2, Building2, Mail, Phone, ArrowUpRight, Link2,
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
import { useRole } from "@/hooks/use-role";
import {
  consApi, type ConsCliente, type ConsEscopo, type ConsMeta, type ConsKpis,
} from "@/lib/consultoria-api";

const STATUS_CLIENTE_COLOR: Record<string, string> = {
  prospect: "bg-gray-100 text-gray-700",
  ativo: "bg-green-100 text-green-800",
  inativo: "bg-gray-100 text-gray-500",
};
const STATUS_ESCOPO_COLOR: Record<string, string> = {
  proposto: "bg-gray-100 text-gray-700",
  em_andamento: "bg-amber-100 text-amber-800",
  concluido: "bg-green-100 text-green-800",
  pausado: "bg-gray-100 text-gray-500",
};

export function ConsultoriaCarteira() {
  const role = useRole();
  const meuNome = role.status === "authenticated" ? role.nome : "Equipe";

  const [clientes, setClientes] = useState<ConsCliente[]>([]);
  const [meta, setMeta] = useState<ConsMeta | null>(null);
  const [kpis, setKpis] = useState<ConsKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<ConsCliente | null>(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    try {
      const [cs, m, k] = await Promise.all([consApi.listar(), consApi.meta(), consApi.kpis()]);
      setClientes(cs); setMeta(m); setKpis(k);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  async function abrir(id: number) { setAberto(await consApi.obter(id)); }

  return (
    <div className="space-y-4">
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Clientes" value={kpis.total_clientes} color="#0A2540" />
          <KPI label="Ativos" value={kpis.clientes_ativos} color="#27AE60" />
          <KPI label="Escopos" value={kpis.total_escopos} color="#156082" />
          <KPI label="Em andamento" value={kpis.escopos_em_andamento} color="#FFC000" />
        </div>
      )}

      <div className="flex justify-end">
        <NovoClienteDialog meta={meta} autor={meuNome} onCriado={recarregar} />
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-brand-navy" /></div>
      ) : clientes.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhum cliente cadastrado ainda. Crie o primeiro.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => abrir(c.id)}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-tight">{c.nome}</h4>
                  <Badge variant="outline" className={`text-[9px] shrink-0 ${STATUS_CLIENTE_COLOR[c.status] ?? ""}`}>{meta?.status_cliente_labels[c.status] ?? c.status}</Badge>
                </div>
                {c.setor && <p className="text-[11px] text-muted-foreground">{c.setor}</p>}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                  <span>{c.n_escopos} escopo{c.n_escopos !== 1 ? "s" : ""}</span>
                  {c.responsavel && <span>· {c.responsavel}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {aberto && meta && (
        <ClienteDialog
          cliente={aberto}
          meta={meta}
          autor={meuNome}
          onClose={() => setAberto(null)}
          onChange={async () => { await recarregar(); setAberto(await consApi.obter(aberto.id)); }}
          onDeleted={async () => { setAberto(null); await recarregar(); }}
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

function ClienteDialog({
  cliente, meta, autor, onClose, onChange, onDeleted,
}: {
  cliente: ConsCliente;
  meta: ConsMeta;
  autor: string;
  onClose: () => void;
  onChange: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [novoEscopo, setNovoEscopo] = useState(false);

  async function mudarStatus(status: string) {
    setBusy(true);
    try { await consApi.atualizar(cliente.id, { status }); onChange(); } finally { setBusy(false); }
  }
  async function deletar() {
    if (!confirm(`Deletar o cliente "${cliente.nome}" e seus escopos?`)) return;
    setBusy(true);
    try { await consApi.deletar(cliente.id); onDeleted(); } finally { setBusy(false); }
  }
  async function mudarEscopoStatus(id: number, status: string) {
    setBusy(true);
    try { await consApi.atualizarEscopo(id, { status }); onChange(); } finally { setBusy(false); }
  }
  async function deletarEscopo(id: number) {
    setBusy(true);
    try { await consApi.deletarEscopo(id); onChange(); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-base">{cliente.nome}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Identidade */}
          <div className="space-y-1 text-sm">
            {cliente.setor && <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{cliente.setor}{cliente.cnpj ? ` · ${cliente.cnpj}` : ""}</p>}
            {cliente.contato_nome && <p className="text-muted-foreground">{cliente.contato_nome}</p>}
            {cliente.contato_email && <p className="flex items-center gap-2 text-xs"><Mail className="h-3 w-3" />{cliente.contato_email}</p>}
            {cliente.contato_telefone && <p className="flex items-center gap-2 text-xs"><Phone className="h-3 w-3" />{cliente.contato_telefone}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Status do cliente</label>
            <Select value={cliente.status} onValueChange={mudarStatus} disabled={busy}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {meta.status_cliente.map((s) => <SelectItem key={s} value={s} className="text-xs">{meta.status_cliente_labels[s] ?? s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Escopos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold">Escopos ({cliente.escopos.length})</label>
              <Button size="sm" variant="outline" onClick={() => setNovoEscopo(true)} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Escopo
              </Button>
            </div>
            <div className="space-y-2">
              {cliente.escopos.map((e) => (
                <div key={e.id} className="rounded-lg border p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{e.titulo}</p>
                      <Badge variant="secondary" className="text-[9px] mt-0.5">{meta.tipo_labels[e.tipo] ?? e.tipo}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deletarEscopo(e.id)} disabled={busy}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  {e.descricao && <p className="text-[11px] text-muted-foreground">{e.descricao}</p>}
                  {e.vinculos && e.vinculos.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {e.vinculos.map((v, i) => (
                        <Link key={i} href={v.href} className="inline-flex items-center gap-0.5 text-[10px] text-brand-teal hover:underline">
                          <Link2 className="h-2.5 w-2.5" />{v.label}<ArrowUpRight className="h-2.5 w-2.5" />
                        </Link>
                      ))}
                    </div>
                  )}
                  <Select value={e.status} onValueChange={(s) => mudarEscopoStatus(e.id, s)} disabled={busy}>
                    <SelectTrigger className={`h-6 text-[10px] w-36 ${STATUS_ESCOPO_COLOR[e.status] ?? ""}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {meta.status_escopo.map((s) => <SelectItem key={s} value={s} className="text-xs">{meta.status_escopo_labels[s] ?? s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {cliente.escopos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum escopo. Adicione o primeiro.</p>}
            </div>
          </div>

          <Button variant="ghost" size="sm" className="text-destructive" onClick={deletar} disabled={busy}>
            <Trash2 className="h-3 w-3 mr-1" /> Deletar cliente
          </Button>
        </div>

        {novoEscopo && (
          <NovoEscopoDialog
            clienteId={cliente.id}
            meta={meta}
            onClose={() => setNovoEscopo(false)}
            onCriado={() => { setNovoEscopo(false); onChange(); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NovoEscopoDialog({
  clienteId, meta, onClose, onCriado,
}: {
  clienteId: number;
  meta: ConsMeta;
  onClose: () => void;
  onCriado: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("diagnostico");
  const [descricao, setDescricao] = useState("");
  const [vinculos, setVinculos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleVinc(m: string) {
    setVinculos((v) => v.includes(m) ? v.filter((x) => x !== m) : [...v, m]);
  }

  async function salvar() {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const vincObjs = vinculos.map((m) => ({ modulo: m, ...meta.modulos_vinculaveis[m] }));
      await consApi.criarEscopo(clienteId, {
        titulo: titulo.trim(), tipo, descricao: descricao.trim() || undefined,
        vinculos: vincObjs.length ? vincObjs : undefined,
      });
      onCriado();
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo escopo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do escopo" />
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" />
          <div>
            <label className="text-xs font-semibold block mb-1">Frente</label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {meta.tipos_escopo.map((t) => <SelectItem key={t} value={t} className="text-xs">{meta.tipo_labels[t] ?? t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Vincular a módulos internos</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(meta.modulos_vinculaveis).map(([m, info]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleVinc(m)}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    vinculos.includes(m)
                      ? "bg-brand-teal/15 text-brand-teal border-brand-teal/30 font-semibold"
                      : "bg-muted/40 text-muted-foreground/60 border-transparent hover:border-brand-teal/20"
                  }`}
                >
                  {info.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={salvar} disabled={saving || !titulo.trim()} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90">
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Criar escopo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NovoClienteDialog({
  meta, autor, onCriado,
}: {
  meta: ConsMeta | null;
  autor: string;
  onCriado: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contato, setContato] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      await consApi.criar({
        nome: nome.trim(), setor: setor.trim() || undefined, cnpj: cnpj.trim() || undefined,
        contato_nome: contato.trim() || undefined, contato_email: email.trim() || undefined,
        responsavel: autor, criado_por: autor,
      });
      setOpen(false);
      setNome(""); setSetor(""); setCnpj(""); setContato(""); setEmail("");
      onCriado();
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)} className="bg-brand-navy text-white hover:bg-brand-navy/90">
        <Plus className="h-3 w-3 mr-1" /> Novo cliente
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Setor" />
            <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="CNPJ" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="Contato" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" />
          </div>
          <Button onClick={salvar} disabled={saving || !nome.trim()} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90">
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Criar cliente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
