"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  criarProjeto,
  fetchProjetos,
  type Projeto,
} from "@/lib/corporativo-api";
import { fetchPessoas, type Pessoa } from "@/lib/riscos-api";

const STATUS_COR: Record<string, string> = {
  planejamento: "#0ea5e9",
  em_execucao: "#16a34a",
  concluido: "#64748b",
  suspenso: "#f59e0b",
  cancelado: "#9ca3af",
};

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reload = () => fetchProjetos().then(setProjetos);

  useEffect(() => {
    reload();
    fetchPessoas().then(setPessoas);
  }, []);

  const totais = useMemo(() => {
    return {
      total: projetos.length,
      em_execucao: projetos.filter((p) => p.status === "em_execucao").length,
      riscos: projetos.reduce((s, p) => s + p.n_riscos, 0),
    };
  }, [projetos]);

  const fmtBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Iniciativas e projetos que contêm riscos de projeto (vs corporativos).
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Novo projeto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo projeto</DialogTitle>
            </DialogHeader>
            <NovoProjetoForm
              pessoas={pessoas}
              onSaved={() => {
                setDialogOpen(false);
                reload();
              }}
            />
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Mini label="Total de projetos" value={totais.total} />
        <Mini label="Em execução" value={totais.em_execucao} accent="#16a34a" />
        <Mini label="Riscos mapeados" value={totais.riscos} accent="#dc2626" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {projetos.map((p) => {
          const cor = STATUS_COR[p.status] ?? "#64748b";
          return (
            <Link
              key={p.id}
              href={`/projetos/${p.id}`}
              className="block no-underline"
            >
              <Card className="h-full transition hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{p.codigo}</div>
                      <CardTitle className="text-base">
                        <FolderOpen className="mr-1 inline h-4 w-4" />
                        {p.nome}
                      </CardTitle>
                    </div>
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                      style={{ backgroundColor: cor }}
                    >
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {p.descricao && <p className="text-muted-foreground">{p.descricao}</p>}
                  <div className="flex flex-wrap gap-2">
                    {p.owner_nome && (
                      <span className="rounded bg-muted px-2 py-0.5">👤 {p.owner_nome}</span>
                    )}
                    {p.orcamento && (
                      <span className="rounded bg-muted px-2 py-0.5">💰 {fmtBRL(p.orcamento)}</span>
                    )}
                    {p.data_inicio && p.data_fim && (
                      <span className="rounded bg-muted px-2 py-0.5">
                        {p.data_inicio} → {p.data_fim}
                      </span>
                    )}
                  </div>
                  <div className="text-primary text-[11px]">
                    Abrir hub do projeto →  ({p.n_riscos} riscos)
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NovoProjetoForm({
  pessoas,
  onSaved,
}: {
  pessoas: Pessoa[];
  onSaved: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState("planejamento");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [owner, setOwner] = useState<string>("none");
  const [orcamento, setOrcamento] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!codigo || !nome) {
          setError("Código e nome são obrigatórios");
          return;
        }
        setSaving(true);
        try {
          await criarProjeto({
            codigo,
            nome,
            descricao: descricao || undefined,
            status,
            data_inicio: dataIni || null,
            data_fim: dataFim || null,
            owner_id: owner === "none" ? null : Number(owner),
            orcamento: orcamento ? Number(orcamento) : null,
          });
          onSaved();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Código *</label>
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="PROJ-XXX"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planejamento">Planejamento</SelectItem>
              <SelectItem value="em_execucao">Em execução</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Nome *</label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Descrição</label>
        <textarea
          className="min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Data início</label>
          <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Data fim</label>
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Owner</label>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {pessoas.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Orçamento (R$)</label>
          <Input
            type="number"
            value={orcamento}
            onChange={(e) => setOrcamento(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Salvando…" : "Criar projeto"}
      </Button>
    </form>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold" style={{ color: accent }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
