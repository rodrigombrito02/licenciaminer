"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ListTodo,
  Upload,
  Plus,
  FolderOpen,
  FileSpreadsheet,
  Trash2,
  Users,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  paApi,
  type PaCliente,
  type PaProjeto,
  type PaPlano,
  type PaUploadPreview,
} from "@/lib/api";

export default function PlanosDeAcaoPage() {
  const [clientes, setClientes] = useState<PaCliente[]>([]);
  const [projetos, setProjetos] = useState<PaProjeto[]>([]);
  const [planos, setPlanos] = useState<PaPlano[]>([]);
  const [clienteAtivo, setClienteAtivo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const cs = await paApi.listarClientes();
      setClientes(cs);
      if (cs.length > 0) {
        const ativo = clienteAtivo && cs.find(c => c.id === clienteAtivo) ? clienteAtivo : cs[0].id;
        setClienteAtivo(ativo);
        const [ps, pl] = await Promise.all([
          paApi.listarProjetos(ativo),
          paApi.listarPlanos(ativo),
        ]);
        setProjetos(ps);
        setPlanos(pl);
      } else {
        setProjetos([]);
        setPlanos([]);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [clienteAtivo]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const cliente = clientes.find(c => c.id === clienteAtivo);
  const planosAvulsos = planos.filter(p => !p.projeto_estrategico_id);
  const planosAgrupados = projetos.map(proj => ({
    projeto: proj,
    planos: planos.filter(p => p.projeto_estrategico_id === proj.id),
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#1A2C42] to-[#0A2540] p-6 text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ListTodo className="h-5 w-5 text-brand-gold" />
            <h1 className="font-heading text-2xl font-bold">Plano de Ações</h1>
            <Badge className="bg-brand-gold/20 text-brand-gold border-brand-gold/40 ml-2">Sprint 1</Badge>
          </div>
          <p className="text-sm text-white/70 max-w-2xl">
            Upload de planos heterogêneos (XLSX/CSV) com mapeamento automático de colunas. Piloto: MUSA.
          </p>
        </div>
        {clientes.length > 0 && (
          <Select value={clienteAtivo ? String(clienteAtivo) : ""} onValueChange={(v) => setClienteAtivo(Number(v))}>
            <SelectTrigger className="w-[240px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Cliente ativo" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {erro && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> {erro}
          </CardContent>
        </Card>
      )}

      {loading && !cliente && (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-brand-teal" /></div>
      )}

      {/* Sem clientes */}
      {!loading && clientes.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Users className="h-12 w-12 text-brand-teal mx-auto" />
            <div>
              <h2 className="font-bold text-lg">Comece criando seu primeiro cliente</h2>
              <p className="text-sm text-muted-foreground">Ex: MUSA, Vale, CSN — para organizar seus planos</p>
            </div>
            <NovoClienteDialog onCreated={recarregar} />
          </CardContent>
        </Card>
      )}

      {/* Com cliente ativo */}
      {cliente && (
        <>
          {/* KPI strip + ações */}
          <div className="grid md:grid-cols-4 gap-3">
            <KPI label="Projetos estratégicos" value={projetos.length} />
            <KPI label="Planos importados" value={planos.length} />
            <KPI label="Tarefas totais" value={planos.reduce((s, p) => s + p.n_tarefas, 0)} />
            <KPI label="Planos avulsos" value={planosAvulsos.length} />
          </div>

          <div className="flex flex-wrap gap-2">
            <NovoClienteDialog onCreated={recarregar} />
            <NovoProjetoDialog clienteId={cliente.id} onCreated={recarregar} />
            <UploadPlanoDialog
              clienteId={cliente.id}
              projetos={projetos}
              onUploaded={recarregar}
            />
          </div>

          {/* Projetos estratégicos */}
          {planosAgrupados.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-brand-teal" />
                Projetos Estratégicos
              </h2>
              {planosAgrupados.map(({ projeto, planos: planosPrj }) => (
                <Card key={projeto.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base font-heading">
                      <span>{projeto.nome}</span>
                      <Badge variant="outline">{planosPrj.length} planos · {planosPrj.reduce((s, p) => s + p.n_tarefas, 0)} tarefas</Badge>
                    </CardTitle>
                    {projeto.descricao && (
                      <p className="text-xs text-muted-foreground">{projeto.descricao}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    {planosPrj.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhum plano vinculado ainda.</p>
                    ) : (
                      <ul className="divide-y">
                        {planosPrj.map(p => <PlanoRow key={p.id} plano={p} onDeleted={recarregar} />)}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Planos avulsos */}
          {planosAvulsos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">Planos Avulsos</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y">
                  {planosAvulsos.map(p => <PlanoRow key={p.id} plano={p} onDeleted={recarregar} />)}
                </ul>
              </CardContent>
            </Card>
          )}

          {planos.length === 0 && projetos.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground space-y-3">
                <FileSpreadsheet className="h-10 w-10 text-brand-teal mx-auto" />
                <p>Crie um projeto estratégico ou suba um plano direto (XLSX) para começar.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-3xl font-bold font-tabular text-brand-navy">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function PlanoRow({ plano, onDeleted }: { plano: PaPlano; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    if (!confirm(`Deletar plano "${plano.nome}"? Tarefas associadas também serão removidas.`)) return;
    setDeleting(true);
    try { await paApi.deletarPlano(plano.id); onDeleted(); }
    finally { setDeleting(false); }
  }
  return (
    <li className="py-2 flex items-center justify-between gap-2">
      <Link href={`/planos-de-acao/${plano.id}`} className="flex-1 group">
        <div className="flex items-center gap-2 text-sm font-medium group-hover:text-brand-teal">
          <FileSpreadsheet className="h-4 w-4 text-brand-teal" />
          {plano.nome}
          <ChevronRight className="h-3 w-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
        </div>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
          <span>{plano.n_tarefas} tarefas</span>
          {plano.arquivo_origem && <span>· {plano.arquivo_origem}</span>}
          <span>· v{plano.versao} · {new Date(plano.atualizado_em).toLocaleDateString("pt-BR")}</span>
        </div>
      </Link>
      <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} title="Deletar">
        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-destructive" />}
      </Button>
    </li>
  );
}

function NovoClienteDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      await paApi.criarCliente({ nome: nome.trim(), descricao: descricao.trim() || undefined });
      setNome(""); setDescricao(""); setOpen(false); onCreated();
    } catch (e) {
      alert("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Cliente</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome (ex: MUSA)" value={nome} onChange={e => setNome(e.target.value)} />
          <Input placeholder="Descrição (opcional)" value={descricao} onChange={e => setDescricao(e.target.value)} />
          <Button onClick={handleSave} disabled={saving || !nome.trim()}>
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NovoProjetoDialog({ clienteId, onCreated }: { clienteId: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      await paApi.criarProjeto({ cliente_id: clienteId, nome: nome.trim(), descricao: descricao.trim() || undefined });
      setNome(""); setDescricao(""); setOpen(false); onCreated();
    } catch (e) {
      alert("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Projeto Estratégico</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Projeto Estratégico</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nome (ex: Compactos, Drenagem)" value={nome} onChange={e => setNome(e.target.value)} />
          <Input placeholder="Descrição (opcional)" value={descricao} onChange={e => setDescricao(e.target.value)} />
          <Button onClick={handleSave} disabled={saving || !nome.trim()}>
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadPlanoDialog({
  clienteId, projetos, onUploaded,
}: { clienteId: number; projetos: PaProjeto[]; onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PaUploadPreview | null>(null);
  const [nome, setNome] = useState("");
  const [projetoId, setProjetoId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setNome(f.name.replace(/\.(xlsx|xls|xlsm|csv)$/i, ""));
    setLoading(true);
    try {
      const p = await paApi.uploadPreview(f);
      setPreview(p);
    } catch (e) {
      alert("Erro no preview: " + (e instanceof Error ? e.message : String(e)));
    } finally { setLoading(false); }
  }

  async function handleImport() {
    if (!file || !nome.trim()) return;
    setImporting(true);
    try {
      await paApi.uploadImportar({
        file, cliente_id: clienteId, nome: nome.trim(),
        projeto_id: projetoId ? Number(projetoId) : undefined,
      });
      setOpen(false); setFile(null); setPreview(null); setNome(""); setProjetoId("");
      onUploaded();
    } catch (e) {
      alert("Erro no import: " + (e instanceof Error ? e.message : String(e)));
    } finally { setImporting(false); }
  }

  function reset() {
    setFile(null); setPreview(null); setNome(""); setProjetoId("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-brand-teal hover:bg-brand-teal/90"><Upload className="h-3 w-3 mr-1" />Subir Plano (XLSX)</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Importar Plano</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!preview && (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-brand-teal mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Selecione um arquivo XLSX/XLSM</p>
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm"
                onChange={handleFile}
                disabled={loading}
                className="block mx-auto text-sm"
              />
              {loading && <Loader2 className="h-5 w-5 animate-spin mx-auto mt-2 text-brand-teal" />}
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="text-xs space-y-1 bg-muted/40 rounded p-3">
                <div><strong>Arquivo:</strong> {preview.filename} · aba "{preview.sheet}"</div>
                <div><strong>{preview.n_linhas_validas}</strong> linhas válidas de {preview.n_linhas_total} totais</div>
                <div><strong>{preview.headers.length}</strong> colunas detectadas</div>
              </div>

              <div className="text-xs">
                <div className="font-bold mb-1">Mapeamento automático:</div>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(preview.mapping_sugerido).map(([campo, col]) => (
                    <div key={campo} className="flex items-center gap-1">
                      {col ? <CheckCircle2 className="h-3 w-3 text-success" /> : <AlertTriangle className="h-3 w-3 text-warning" />}
                      <span className="font-medium">{campo}:</span>
                      <span className="text-muted-foreground truncate">{col || "(não encontrado)"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium block">Nome do plano</label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Plano de Drenagem PDE Norte" />
                <label className="text-xs font-medium block">Projeto estratégico (opcional — plano avulso se vazio)</label>
                <Select value={projetoId} onValueChange={setProjetoId}>
                  <SelectTrigger><SelectValue placeholder="Avulso" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">(avulso)</SelectItem>
                    {projetos.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={reset}>Trocar arquivo</Button>
                <Button onClick={handleImport} disabled={importing || !nome.trim()} className="bg-brand-teal hover:bg-brand-teal/90">
                  {importing && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Importar {preview.n_linhas_validas} tarefas
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
