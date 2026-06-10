"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ControlesDashboardCards } from "@/components/riscos/controles-dashboard";
import { SortableTh, useSortedRows } from "@/components/riscos/sortable-table";
import {
  atualizarControle,
  criarControle,
  excluirControle,
  fetchControles,
  fetchControlesDashboard,
  fetchPessoas,
  fetchRiscos,
  type Controle,
  type ControlesDashboard,
  type Pessoa,
  type Risco,
} from "@/lib/riscos-api";
import {
  createTesteControle,
  fetchTestesControle,
  type TesteControle,
} from "@/lib/monitoramento-api";

const STATUS_TESTE_COLOR: Record<string, string> = {
  aprovado: "#16a34a",
  parcial: "#eab308",
  reprovado: "#dc2626",
};

export default function ControlesPage() {
  const [controles, setControles] = useState<Controle[]>([]);
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [dashboard, setDashboard] = useState<ControlesDashboard | null>(null);
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterRisco, setFilterRisco] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reload = async () => {
    const [cs, rs, ps, dash] = await Promise.all([
      fetchControles({
        tipo: filterTipo !== "all" ? filterTipo : undefined,
        risco_id: filterRisco !== "all" ? Number(filterRisco) : undefined,
      }),
      fetchRiscos(),
      fetchPessoas(),
      fetchControlesDashboard(),
    ]);
    setControles(cs);
    setRiscos(rs);
    setPessoas(ps);
    setDashboard(dash);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTipo, filterRisco]);

  const filtered = useMemo(() => {
    if (!search) return controles;
    const t = search.toLowerCase();
    return controles.filter(
      (c) =>
        c.descricao.toLowerCase().includes(t) ||
        (c.categoria ?? "").toLowerCase().includes(t) ||
        (c.responsavel_nome ?? "").toLowerCase().includes(t),
    );
  }, [controles, search]);

  const { sorted, sortState, toggleSort } = useSortedRows<
    Controle,
    "descricao" | "risco" | "tipo" | "responsavel" | "categoria" | "periodicidade" | "ultimo_teste" | "status_teste" | "efetividade"
  >(
    filtered,
    {
      descricao: (c) => c.descricao,
      risco: (c) => riscos.find((r) => r.id === c.risco_id)?.codigo ?? "",
      tipo: (c) => c.tipo,
      responsavel: (c) => c.responsavel_nome ?? "",
      categoria: (c) => c.categoria ?? "",
      periodicidade: (c) => c.periodicidade_teste ?? "",
      ultimo_teste: (c) => c.ultimo_teste ?? "",
      status_teste: (c) => c.status_teste ?? "",
      efetividade: (c) => c.efetividade ?? -1,
    },
    { key: "risco", dir: "asc" },
  );

  const total = controles.length;
  const preventivos = controles.filter((c) => c.tipo === "preventivo").length;
  const corretivos = total - preventivos;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Controles</h1>
          <p className="text-sm text-muted-foreground">
            {total} controles · {preventivos} preventivos · {corretivos} corretivos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ Novo controle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo controle</DialogTitle>
            </DialogHeader>
            <NovoControleForm
              riscos={riscos}
              pessoas={pessoas}
              onSaved={async () => {
                setDialogOpen(false);
                await reload();
              }}
            />
          </DialogContent>
        </Dialog>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="lista">Lista ({controles.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="pt-3">
          {dashboard ? (
            <ControlesDashboardCards data={dashboard} />
          ) : (
            <p className="text-sm text-muted-foreground">Carregando indicadores…</p>
          )}
        </TabsContent>
        <TabsContent value="lista" className="space-y-4 pt-3">

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            placeholder="Buscar descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="preventivo">Preventivo</SelectItem>
              <SelectItem value="corretivo">Corretivo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRisco} onValueChange={setFilterRisco}>
            <SelectTrigger>
              <SelectValue placeholder="Risco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os riscos</SelectItem>
              {riscos.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.codigo} — {r.nome.slice(0, 40)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
          ) : sorted.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum controle cadastrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh label="Descrição" sortKey="descricao" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Risco" sortKey="risco" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Tipo" sortKey="tipo" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Categoria" sortKey="categoria" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Responsável" sortKey="responsavel" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Periodicidade" sortKey="periodicidade" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Último teste" sortKey="ultimo_teste" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Status" sortKey="status_teste" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Ef." sortKey="efetividade" state={sortState} onToggle={toggleSort} />
                  <th></th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((c) => (
                  <ControleRow
                    key={c.id}
                    controle={c}
                    riscos={riscos}
                    onChange={reload}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ControleRow({
  controle,
  riscos,
  onChange,
}: {
  controle: Controle;
  riscos: Risco[];
  onChange: () => void;
}) {
  const risco = riscos.find((r) => r.id === controle.risco_id);
  const [testeOpen, setTesteOpen] = useState(false);

  return (
    <TableRow>
      <TableCell className="max-w-[300px] text-xs">
        <input
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-input focus:border-input"
          defaultValue={controle.descricao}
          onBlur={async (e) => {
            if (e.target.value !== controle.descricao) {
              await atualizarControle(controle.id, { descricao: e.target.value });
              onChange();
            }
          }}
        />
      </TableCell>
      <TableCell className="text-xs">
        {risco ? (
          <Link
            href={`/gestao-riscos/riscos/${risco.id}`}
            className="font-mono hover:underline"
          >
            {risco.codigo}
          </Link>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell>
        <span className="rounded bg-muted px-2 py-0.5 text-[11px]">{controle.tipo}</span>
      </TableCell>
      <TableCell className="text-[11px] text-muted-foreground">
        {controle.categoria ?? "—"}
      </TableCell>
      <TableCell className="text-[11px] text-muted-foreground">
        {controle.responsavel_nome ?? "—"}
      </TableCell>
      <TableCell className="text-xs">
        <input
          className="w-24 rounded border border-transparent bg-transparent px-1 hover:border-input focus:border-input"
          placeholder="mensal, anual..."
          defaultValue={controle.periodicidade_teste ?? ""}
          onBlur={async (e) => {
            await atualizarControle(controle.id, {
              periodicidade_teste: e.target.value || null,
            });
            onChange();
          }}
        />
      </TableCell>
      <TableCell className="text-xs">{controle.ultimo_teste ?? "—"}</TableCell>
      <TableCell>
        {controle.status_teste ? (
          <span
            className="rounded px-2 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: `${STATUS_TESTE_COLOR[controle.status_teste] ?? "#64748b"}22`,
              color: STATUS_TESTE_COLOR[controle.status_teste] ?? "#64748b",
            }}
          >
            {controle.status_teste}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <Select
          value={controle.efetividade == null ? "none" : String(controle.efetividade)}
          onValueChange={async (v) => {
            await atualizarControle(controle.id, {
              efetividade: v === "none" ? null : Number(v),
            });
            onChange();
          }}
        >
          <SelectTrigger className="h-7 w-14 text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="space-x-1 whitespace-nowrap">
        <Dialog open={testeOpen} onOpenChange={setTesteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              Testar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar teste do controle</DialogTitle>
            </DialogHeader>
            <TesteForm
              controleId={controle.id}
              onSaved={async () => {
                setTesteOpen(false);
                await onChange();
              }}
            />
          </DialogContent>
        </Dialog>
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={async () => {
            if (!confirm("Excluir controle?")) return;
            await excluirControle(controle.id);
            onChange();
          }}
        >
          ✕
        </Button>
      </TableCell>
    </TableRow>
  );
}

function TesteForm({
  controleId,
  onSaved,
}: {
  controleId: number;
  onSaved: () => void;
}) {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"aprovado" | "reprovado" | "parcial">(
    "aprovado",
  );
  const [metodologia, setMetodologia] = useState("");
  const [evidencia, setEvidencia] = useState("");
  const [gaps, setGaps] = useState("");
  const [plano, setPlano] = useState("");
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<TesteControle[]>([]);

  useEffect(() => {
    fetchTestesControle(controleId).then(setHistorico).catch(() => {});
  }, [controleId]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await createTesteControle(controleId, {
              data_teste: data,
              status: status,
              metodologia: metodologia || undefined,
              evidencia: evidencia || undefined,
              gaps_identificados: gaps || undefined,
              plano_acao_remediacao: plano || undefined,
            });
            onSaved();
          } finally {
            setSaving(false);
          }
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Data do teste</label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="reprovado">Reprovado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Metodologia</label>
          <Input
            placeholder="Ex.: Walkthrough + amostragem n=5"
            value={metodologia}
            onChange={(e) => setMetodologia(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Evidência</label>
          <textarea
            className="min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Link, hash, descrição da evidência coletada…"
            value={evidencia}
            onChange={(e) => setEvidencia(e.target.value)}
          />
        </div>
        {status !== "aprovado" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium">Gaps identificados</label>
              <textarea
                className="min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={gaps}
                onChange={(e) => setGaps(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Plano de remediação</label>
              <textarea
                className="min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={plano}
                onChange={(e) => setPlano(e.target.value)}
              />
            </div>
          </>
        )}
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando…" : "Registrar teste no histórico"}
        </Button>
      </form>

      {historico.length > 0 && (
        <div className="border-t border-border pt-3">
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Histórico ({historico.length})
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {historico.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-2 rounded border border-border p-2 text-xs"
              >
                <span className="font-mono">{t.data_teste}</span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    t.status === "aprovado"
                      ? "bg-green-500/20 text-green-700"
                      : t.status === "parcial"
                      ? "bg-yellow-500/20 text-yellow-700"
                      : "bg-red-500/20 text-red-700"
                  }`}
                >
                  {t.status}
                </span>
                {t.executor_nome && (
                  <span className="text-muted-foreground">por {t.executor_nome}</span>
                )}
                {t.gaps_identificados && (
                  <span className="w-full text-[10px] text-red-700">⚠ {t.gaps_identificados}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NovoControleForm({
  riscos,
  pessoas,
  onSaved,
}: {
  riscos: Risco[];
  pessoas: Pessoa[];
  onSaved: () => void;
}) {
  const [riscoId, setRiscoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"preventivo" | "corretivo">("preventivo");
  const [responsavel, setResponsavel] = useState<string>("none");
  const [periodicidade, setPeriodicidade] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!riscoId || !descricao) {
          setError("Risco e descrição são obrigatórios.");
          return;
        }
        setSaving(true);
        try {
          await criarControle({
            risco_id: Number(riscoId),
            descricao,
            tipo,
            responsavel_id: responsavel === "none" ? null : Number(responsavel),
            periodicidade_teste: periodicidade || null,
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
      <div>
        <label className="mb-1 block text-xs font-medium">Risco *</label>
        <Select value={riscoId} onValueChange={setRiscoId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o risco" />
          </SelectTrigger>
          <SelectContent>
            {riscos.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.codigo} — {r.nome.slice(0, 50)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Descrição *</label>
        <textarea
          className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Tipo</label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preventivo">Preventivo</SelectItem>
              <SelectItem value="corretivo">Corretivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Periodicidade</label>
          <Input
            placeholder="mensal, trimestral, anual…"
            value={periodicidade}
            onChange={(e) => setPeriodicidade(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Responsável</label>
        <Select value={responsavel} onValueChange={setResponsavel}>
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Salvando…" : "Criar controle"}
      </Button>
    </form>
  );
}
