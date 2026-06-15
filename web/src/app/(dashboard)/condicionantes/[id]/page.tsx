"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Building2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { RoleGate } from "@/components/role-gate";
import { CardAcessoPanel } from "@/components/card-acesso-panel";
import { useRole } from "@/hooks/use-role";
import { podeEditar, podeGerenciarAcesso, type CardAcl } from "@/lib/card-acl";
import {
  condApi, COND_STATUS_COLOR, COND_STATUS_LABEL, PRAZO_LABEL,
  type Licenca, type Condicionante,
} from "@/lib/condicionantes-api";

const STATUS_OPTS = ["pendente", "em_andamento", "cumprida", "atrasada", "nao_aplicavel"];

export default function Page() {
  return (
    <RoleGate minRole="consultor" fallback={<p className="p-8 text-center text-sm text-muted-foreground">Área interna.</p>}>
      <Inner />
    </RoleGate>
  );
}

function Inner() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const role = useRole();
  const meuNome = role.status === "authenticated" ? role.nome : "";
  const isAdmin = role.status === "authenticated" && role.role === "admin";

  const [lic, setLic] = useState<Licenca | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setLic(await condApi.obter(id));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-brand-teal" /></div>;
  if (!lic) return <p className="p-8 text-center text-sm text-muted-foreground">Licença não encontrada.</p>;

  const aclCtx = { acl: lic.acl as CardAcl | null, lider: lic.lider_responsavel, criador: lic.criado_por, meuNome, isAdmin };
  const canEdit = podeEditar(aclCtx);
  const canManage = podeGerenciarAcesso(aclCtx);

  async function salvarAcesso(data: { lider_responsavel: string; acl: CardAcl }) {
    await condApi.atualizar(id, data);
    await carregar();
  }

  const conds = lic.condicionantes ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/condicionantes")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-brand-teal" /> {lic.empreendimento}</h1>
          <p className="text-xs text-muted-foreground">
            {[lic.tipo && `${lic.tipo} ${lic.numero_licenca ?? ""}`, lic.orgao, lic.processo && `Proc. ${lic.processo}`, lic.municipio && `${lic.municipio}/${lic.uf}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        {lic.data_validade && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Validade</p>
            <p className="text-sm font-bold">{new Date(lic.data_validade).toLocaleDateString("pt-BR")}</p>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Condicionantes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Condicionantes ({conds.length})</h3>
            {canEdit && <NovaCondicionanteDialog licId={id} onAdd={carregar} />}
          </div>

          {conds.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma condicionante. Adicione a primeira.</CardContent></Card>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Condicionante</TableHead>
                    <TableHead className="w-32">Prazo</TableHead>
                    <TableHead className="w-36">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conds.map((c) => (
                    <CondRow key={c.id} c={c} canEdit={canEdit} onChange={carregar} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Lateral: acesso */}
        <div className="space-y-4">
          <CardAcessoPanel
            lider={lic.lider_responsavel}
            criador={lic.criado_por}
            acl={lic.acl as CardAcl | null}
            podeGerenciar={canManage}
            onSave={salvarAcesso}
          />
        </div>
      </div>
    </div>
  );
}

function CondRow({ c, canEdit, onChange }: { c: Condicionante; canEdit: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  async function setStatus(status: string) {
    setBusy(true);
    try {
      await condApi.atualizarCondicionante(c.id, { status });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  const prazoTxt = c.prazo_efetivo
    ? new Date(c.prazo_efetivo).toLocaleDateString("pt-BR")
    : c.recorrencia
      ? `Recorrente (${c.recorrencia})`
      : PRAZO_LABEL[c.prazo_tipo] ?? c.prazo_tipo;

  return (
    <TableRow className={c.status === "atrasada" ? "bg-red-50/40" : ""}>
      <TableCell className="font-mono text-xs text-muted-foreground align-top">{c.numero}</TableCell>
      <TableCell className="align-top">
        <p className="text-xs leading-snug">{c.descricao}</p>
      </TableCell>
      <TableCell className="align-top">
        <span className={`text-[11px] ${c.status === "atrasada" ? "text-destructive font-semibold flex items-center gap-1" : "text-muted-foreground"}`}>
          {c.status === "atrasada" && <AlertTriangle className="h-3 w-3" />}
          {prazoTxt}
        </span>
      </TableCell>
      <TableCell className="align-top">
        {canEdit ? (
          <Select value={c.status} onValueChange={setStatus} disabled={busy}>
            <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{COND_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className={`text-[9px] ${COND_STATUS_COLOR[c.status] ?? ""}`}>{COND_STATUS_LABEL[c.status]}</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function NovaCondicionanteDialog({ licId, onAdd }: { licId: number; onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazoTipo, setPrazoTipo] = useState("vigencia");
  const [prazoData, setPrazoData] = useState("");
  const [prazoDias, setPrazoDias] = useState("");
  const [recorrencia, setRecorrencia] = useState("anual");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!descricao.trim()) return;
    setSaving(true);
    try {
      await condApi.addCondicionante(licId, {
        numero: numero.trim() || null,
        descricao: descricao.trim(),
        prazo_tipo: prazoTipo,
        prazo_data: prazoTipo === "data" && prazoData ? prazoData : null,
        prazo_dias: prazoTipo === "dias_publicacao" && prazoDias ? Number(prazoDias) : null,
        recorrencia: prazoTipo === "recorrente" ? recorrencia : null,
      } as Partial<Condicionante>);
      setOpen(false);
      setNumero(""); setDescricao(""); setPrazoData(""); setPrazoDias("");
      onAdd();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Condicionante</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova condicionante</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div><label className="text-xs font-medium block mb-1">Nº</label><Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="01" /></div>
            <div><label className="text-xs font-medium block mb-1">Tipo de prazo</label>
              <Select value={prazoTipo} onValueChange={setPrazoTipo}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigencia" className="text-xs">Durante a vigência</SelectItem>
                  <SelectItem value="data" className="text-xs">Data fixa</SelectItem>
                  <SelectItem value="dias_publicacao" className="text-xs">Dias após publicação</SelectItem>
                  <SelectItem value="recorrente" className="text-xs">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Descrição *</label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Texto da condicionante" />
          </div>
          {prazoTipo === "data" && (
            <div><label className="text-xs font-medium block mb-1">Data limite</label><Input type="date" value={prazoData} onChange={(e) => setPrazoData(e.target.value)} /></div>
          )}
          {prazoTipo === "dias_publicacao" && (
            <div><label className="text-xs font-medium block mb-1">Dias após publicação</label><Input type="number" value={prazoDias} onChange={(e) => setPrazoDias(e.target.value)} placeholder="120" /></div>
          )}
          {prazoTipo === "recorrente" && (
            <div><label className="text-xs font-medium block mb-1">Frequência</label>
              <Select value={recorrencia} onValueChange={setRecorrencia}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal" className="text-xs">Mensal</SelectItem>
                  <SelectItem value="trimestral" className="text-xs">Trimestral</SelectItem>
                  <SelectItem value="semestral" className="text-xs">Semestral</SelectItem>
                  <SelectItem value="anual" className="text-xs">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={salvar} disabled={saving || !descricao.trim()} className="w-full bg-brand-teal text-white hover:bg-brand-teal/90">
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
