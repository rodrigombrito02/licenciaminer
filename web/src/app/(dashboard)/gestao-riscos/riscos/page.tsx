"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ClassificacaoBadge } from "@/components/riscos/classificacao-badge";
import { SortableTh, useSortedRows } from "@/components/riscos/sortable-table";
import {
  CLASSIFICACAO_COLOR,
  CLASSIFICACAO_LABEL,
  CLASSIFICACAO_ORDER,
  fetchCategorias,
  fetchDashboardKpis,
  fetchRiscos,
  type Categoria,
  type Classificacao,
  type DashboardKpis,
  type Risco,
} from "@/lib/riscos-api";

const CLASS_ORDER: Record<string, number> = { C: 4, MS: 3, S: 2, PS: 1 };

const ESTAGIOS = ["aprovacao", "implantacao", "operacao"];

type RiscoSortKey =
  | "codigo"
  | "nome"
  | "categoria"
  | "estagio"
  | "responsavel"
  | "prob_pura"
  | "impacto_pura"
  | "prob_residual"
  | "impacto_residual"
  | "classificacao";

export default function RiscosListPage() {
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [search, setSearch] = useState("");
  const [tipoEscopo, setTipoEscopo] = useState<string>("all");
  const [estagio, setEstagio] = useState<string>("all");
  const [categoriaId, setCategoriaId] = useState<string>("all");
  const [classificacao, setClassificacao] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [lista, cats, k] = await Promise.all([
          fetchRiscos({
            estagio: estagio !== "all" ? estagio : undefined,
            categoria_id: categoriaId !== "all" ? Number(categoriaId) : undefined,
            classificacao: classificacao !== "all" ? classificacao : undefined,
            tipo_escopo: tipoEscopo !== "all" ? tipoEscopo : undefined,
          }),
          fetchCategorias(),
          fetchDashboardKpis(),
        ]);
        if (!mounted) return;
        setRiscos(lista);
        setCategorias(cats);
        setKpis(k);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [estagio, categoriaId, classificacao, tipoEscopo]);

  const filtered = useMemo(() => {
    if (!search) return riscos;
    const term = search.toLowerCase();
    return riscos.filter(
      (r) =>
        r.codigo.toLowerCase().includes(term) ||
        r.nome.toLowerCase().includes(term) ||
        (r.descricao ?? "").toLowerCase().includes(term),
    );
  }, [riscos, search]);

  const { sorted, sortState, toggleSort } = useSortedRows<Risco, RiscoSortKey>(
    filtered,
    {
      codigo: (r) => r.codigo,
      nome: (r) => r.nome,
      categoria: (r) => r.categoria_nome ?? "",
      estagio: (r) => r.estagio ?? "",
      responsavel: (r) => r.responsavel_nome ?? "",
      prob_pura: (r) => r.prob_pura ?? -1,
      impacto_pura: (r) => r.impacto_pura ?? -1,
      prob_residual: (r) => r.prob_residual ?? -1,
      impacto_residual: (r) => r.impacto_residual ?? -1,
      classificacao: (r) => CLASS_ORDER[r.classificacao_residual ?? ""] ?? 0,
    },
    { key: "classificacao", dir: "desc" },
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Riscos</h1>
          <p className="text-sm text-muted-foreground">
            Inventário de riscos identificados — {riscos.length} registros
          </p>
        </div>
        <Button asChild>
          <Link href="/gestao-riscos/riscos/novo">+ Novo risco</Link>
        </Button>
      </header>

      {kpis && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <BigNumber label="Total de riscos" value={kpis.total_riscos} />
          <BigNumber
            label="Críticos"
            value={kpis.por_classificacao_residual.C ?? 0}
            accent={CLASSIFICACAO_COLOR.C}
          />
          <BigNumber
            label="Muito Significativos"
            value={kpis.por_classificacao_residual.MS ?? 0}
            accent={CLASSIFICACAO_COLOR.MS}
          />
          <BigNumber
            label="Fase Aprovação"
            value={kpis.por_estagio.aprovacao ?? 0}
            accent="#0ea5e9"
          />
          <BigNumber
            label="Fase Operação"
            value={kpis.por_estagio.operacao ?? 0}
            accent="#0ea5e9"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input
            placeholder="Buscar código, nome ou descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={tipoEscopo} onValueChange={setTipoEscopo}>
            <SelectTrigger>
              <SelectValue placeholder="Escopo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Projeto + Corporativo</SelectItem>
              <SelectItem value="projeto">Apenas Projeto</SelectItem>
              <SelectItem value="corporativo">Apenas Corporativo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={estagio} onValueChange={setEstagio}>
            <SelectTrigger>
              <SelectValue placeholder="Estágio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estágios</SelectItem>
              {ESTAGIOS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classificacao} onValueChange={setClassificacao}>
            <SelectTrigger>
              <SelectValue placeholder="Classificação residual" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="C">Crítico</SelectItem>
              <SelectItem value="MS">Muito Significativo</SelectItem>
              <SelectItem value="S">Significativo</SelectItem>
              <SelectItem value="PS">Pouco Significativo</SelectItem>
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
              Nenhum risco encontrado. {riscos.length === 0 && "Cadastre um risco para começar."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh
                    label="Código"
                    sortKey="codigo"
                    state={sortState}
                    onToggle={toggleSort}
                    className="w-[120px]"
                  />
                  <SortableTh
                    label="Nome"
                    sortKey="nome"
                    state={sortState}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Categoria"
                    sortKey="categoria"
                    state={sortState}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Estágio"
                    sortKey="estagio"
                    state={sortState}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="Responsável"
                    sortKey="responsavel"
                    state={sortState}
                    onToggle={toggleSort}
                  />
                  <SortableTh
                    label="P (puro)"
                    sortKey="prob_pura"
                    state={sortState}
                    onToggle={toggleSort}
                    className="text-center"
                  />
                  <SortableTh
                    label="I (puro)"
                    sortKey="impacto_pura"
                    state={sortState}
                    onToggle={toggleSort}
                    className="text-center"
                  />
                  <SortableTh
                    label="P (resid)"
                    sortKey="prob_residual"
                    state={sortState}
                    onToggle={toggleSort}
                    className="text-center"
                  />
                  <SortableTh
                    label="I (resid)"
                    sortKey="impacto_residual"
                    state={sortState}
                    onToggle={toggleSort}
                    className="text-center"
                  />
                  <SortableTh
                    label="Classificação"
                    sortKey="classificacao"
                    state={sortState}
                    onToggle={toggleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-semibold">
                      <Link
                        href={`/gestao-riscos/riscos/${r.id}`}
                        className="hover:underline"
                      >
                        {r.codigo}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[380px]">
                      <Link
                        href={`/gestao-riscos/riscos/${r.id}`}
                        className="hover:underline"
                      >
                        {r.nome}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {r.categoria_nome ? (
                        <span
                          className="inline-block rounded px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: `${r.categoria_cor ?? "#64748b"}22`,
                            color: r.categoria_cor ?? "#64748b",
                          }}
                        >
                          {r.categoria_nome}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{r.estagio ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.responsavel_nome ?? "—"}</TableCell>
                    <TableCell className="text-center text-xs">
                      {r.prob_pura ?? "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {r.impacto_pura ?? "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {r.prob_residual ?? "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {r.impacto_residual ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ClassificacaoBadge value={r.classificacao_residual} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BigNumber({
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
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-3xl font-bold" style={{ color: accent }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
