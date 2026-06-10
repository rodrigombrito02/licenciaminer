"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { AcoesDashboardCards } from "@/components/riscos/acoes-dashboard";
import { GanttAcoes } from "@/components/riscos/gantt-acoes";
import { SortableTh, useSortedRows } from "@/components/riscos/sortable-table";
import {
  STATUS_ACAO,
  STATUS_ACAO_COLOR,
  atualizarAcao,
  criarAcao,
  excluirAcao,
  fetchAcoes,
  fetchAcoesDashboard,
  fetchAcoesResumo,
  fetchGanttAcoes,
  fetchPessoas,
  fetchRiscos,
  type Acao,
  type AcoesDashboard,
  type AcoesResumo,
  type GanttAcao,
  type Pessoa,
  type Risco,
} from "@/lib/riscos-api";

export default function AcoesPage() {
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [resumo, setResumo] = useState<AcoesResumo | null>(null);
  const [dashboard, setDashboard] = useState<AcoesDashboard | null>(null);
  const [gantt, setGantt] = useState<GanttAcao[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterRisco, setFilterRisco] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reload = async () => {
    const [as, rs, ps, res, dash, gt] = await Promise.all([
      fetchAcoes({
        status: filterStatus !== "all" ? filterStatus : undefined,
        tipo: filterTipo !== "all" ? filterTipo : undefined,
        risco_id: filterRisco !== "all" ? Number(filterRisco) : undefined,
      }),
      fetchRiscos(),
      fetchPessoas(),
      fetchAcoesResumo(),
      fetchAcoesDashboard(),
      fetchGanttAcoes(),
    ]);
    setAcoes(as);
    setRiscos(rs);
    setPessoas(ps);
    setResumo(res);
    setDashboard(dash);
    setGantt(gt);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterTipo, filterRisco]);

  const filtered = useMemo(() => {
    if (!search) return acoes;
    const t = search.toLowerCase();
    return acoes.filter(
      (a) =>
        a.descricao.toLowerCase().includes(t) ||
        (a.codigo ?? "").toLowerCase().includes(t) ||
        (a.responsavel_nome ?? "").toLowerCase().includes(t) ||
        (a.area ?? "").toLowerCase().includes(t),
    );
  }, [acoes, search]);

  const { sorted, sortState, toggleSort } = useSortedRows<
    Acao,
    "codigo" | "descricao" | "risco" | "tipo" | "responsavel" | "area" | "prazo" | "status" | "percentual"
  >(
    filtered,
    {
      codigo: (a) => a.codigo ?? "",
      descricao: (a) => a.descricao,
      risco: (a) => riscos.find((r) => r.id === a.risco_id)?.codigo ?? "",
      tipo: (a) => a.tipo,
      responsavel: (a) => a.responsavel_nome ?? "",
      area: (a) => a.area ?? "",
      prazo: (a) => a.prazo ?? "",
      status: (a) => a.status,
      percentual: (a) => a.percentual,
    },
    { key: "prazo", dir: "asc" },
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plano de Ações</h1>
          <p className="text-sm text-muted-foreground">
            {resumo
              ? `${resumo.total} ações · ${resumo.atrasadas} atrasadas`
              : "Carregando…"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ Nova ação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova ação</DialogTitle>
            </DialogHeader>
            <NovaAcaoForm
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
          <TabsTrigger value="gantt">Gantt ({gantt.length})</TabsTrigger>
          <TabsTrigger value="lista">Lista ({acoes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="pt-3">
          {dashboard ? (
            <AcoesDashboardCards data={dashboard} />
          ) : (
            <p className="text-sm text-muted-foreground">Carregando indicadores…</p>
          )}
        </TabsContent>
        <TabsContent value="gantt" className="pt-3">
          <GanttAcoes acoes={gantt} riscos={riscos} />
        </TabsContent>
        <TabsContent value="lista" className="space-y-4 pt-3">

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {STATUS_ACAO.map((s) => (
            <Card key={s.value}>
              <CardContent className="flex items-center gap-2 py-3">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: STATUS_ACAO_COLOR[s.value] }}
                />
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="text-lg font-semibold">
                    {resumo.por_status[s.value] ?? 0}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input
            placeholder="Buscar descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_ACAO.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="preventiva">Preventiva</SelectItem>
              <SelectItem value="corretiva">Corretiva</SelectItem>
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
              Nenhuma ação. Clique em "Nova ação" para criar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh label="Cód." sortKey="codigo" state={sortState} onToggle={toggleSort} className="w-[70px]" />
                  <SortableTh label="Descrição" sortKey="descricao" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Risco" sortKey="risco" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Tipo" sortKey="tipo" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Responsável" sortKey="responsavel" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Área" sortKey="area" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Prazo" sortKey="prazo" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Status" sortKey="status" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="%" sortKey="percentual" state={sortState} onToggle={toggleSort} />
                  <th></th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((a) => (
                  <AcaoRow
                    key={a.id}
                    acao={a}
                    riscos={riscos}
                    pessoas={pessoas}
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

function AcaoRow({
  acao,
  riscos,
  pessoas,
  onChange,
}: {
  acao: Acao;
  riscos: Risco[];
  pessoas: Pessoa[];
  onChange: () => void;
}) {
  const risco = riscos.find((r) => r.id === acao.risco_id);
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasada = acao.prazo && acao.prazo < hoje && acao.status !== "concluida";

  return (
    <TableRow>
      <TableCell className="font-mono text-[10px] text-muted-foreground">
        {acao.codigo ?? "—"}
      </TableCell>
      <TableCell className="max-w-[300px]">
        <input
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-input focus:border-input"
          defaultValue={acao.descricao}
          onBlur={async (e) => {
            if (e.target.value !== acao.descricao) {
              await atualizarAcao(acao.id, { descricao: e.target.value });
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
        <span className="rounded bg-muted px-2 py-0.5 text-[11px]">{acao.tipo}</span>
      </TableCell>
      <TableCell className="text-xs">
        <Select
          value={acao.responsavel_id ? String(acao.responsavel_id) : "none"}
          onValueChange={async (v) => {
            await atualizarAcao(acao.id, {
              responsavel_id: v === "none" ? null : Number(v),
            });
            onChange();
          }}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="—" />
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
      </TableCell>
      <TableCell className="text-[11px] text-muted-foreground">
        {acao.area ?? "—"}
      </TableCell>
      <TableCell>
        <input
          type="date"
          className={`rounded border border-transparent bg-transparent px-1 text-xs hover:border-input focus:border-input ${atrasada ? "text-destructive font-semibold" : ""}`}
          defaultValue={acao.prazo ?? ""}
          onBlur={async (e) => {
            await atualizarAcao(acao.id, {
              prazo: e.target.value || null,
            });
            onChange();
          }}
        />
      </TableCell>
      <TableCell>
        <Select
          value={acao.status}
          onValueChange={async (v) => {
            await atualizarAcao(acao.id, { status: v });
            onChange();
          }}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ACAO.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <input
          type="number"
          min={0}
          max={100}
          className="w-14 rounded border border-transparent bg-transparent px-1 text-xs hover:border-input focus:border-input"
          defaultValue={acao.percentual}
          onBlur={async (e) => {
            const n = Math.max(0, Math.min(100, Number(e.target.value) || 0));
            await atualizarAcao(acao.id, { percentual: n });
            onChange();
          }}
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            if (!confirm("Excluir esta ação?")) return;
            await excluirAcao(acao.id);
            onChange();
          }}
        >
          ✕
        </Button>
      </TableCell>
    </TableRow>
  );
}

function NovaAcaoForm({
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
  const [tipo, setTipo] = useState<"preventiva" | "corretiva">("preventiva");
  const [responsavel, setResponsavel] = useState<string>("none");
  const [prazo, setPrazo] = useState("");
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
        setError(null);
        try {
          await criarAcao({
            risco_id: Number(riscoId),
            descricao,
            tipo,
            responsavel_id: responsavel === "none" ? null : Number(responsavel),
            prazo: prazo || null,
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
              <SelectItem value="preventiva">Preventiva</SelectItem>
              <SelectItem value="corretiva">Corretiva</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Prazo</label>
          <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
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
        {saving ? "Salvando…" : "Criar ação"}
      </Button>
    </form>
  );
}
