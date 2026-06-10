"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SortableTh, useSortedRows } from "@/components/riscos/sortable-table";
import {
  CATEGORIA_COR,
  STATUS_CENARIO_COLOR,
  fetchCenarios,
  type CenarioResumo,
} from "@/lib/crises-api";

type SortKey =
  | "codigo"
  | "nome"
  | "categoria"
  | "severidade"
  | "probabilidade"
  | "score"
  | "status"
  | "coordenador";

export default function CenariosPage() {
  const [cenarios, setCenarios] = useState<CenarioResumo[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterSev, setFilterSev] = useState("all");

  useEffect(() => {
    fetchCenarios().then(setCenarios);
  }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return cenarios.filter((c) => {
      if (filterCat !== "all" && c.categoria !== filterCat) return false;
      if (filterSev !== "all" && Number(c.severidade) < Number(filterSev)) return false;
      if (!t) return true;
      return (
        c.codigo.toLowerCase().includes(t) ||
        c.nome.toLowerCase().includes(t) ||
        (c.descricao ?? "").toLowerCase().includes(t)
      );
    });
  }, [cenarios, search, filterCat, filterSev]);

  const { sorted, sortState, toggleSort } = useSortedRows<CenarioResumo, SortKey>(
    filtered,
    {
      codigo: (c) => c.codigo,
      nome: (c) => c.nome,
      categoria: (c) => c.categoria ?? "",
      severidade: (c) => c.severidade ?? 0,
      probabilidade: (c) => c.probabilidade ?? 0,
      score: (c) => (c.severidade ?? 0) * (c.probabilidade ?? 0),
      status: (c) => c.status,
      coordenador: (c) => c.coordenador_nome ?? "",
    },
    { key: "score", dir: "desc" },
  );

  const cats = Array.from(new Set(cenarios.map((c) => c.categoria).filter(Boolean))) as string[];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cenários de crise</h1>
        <p className="text-sm text-muted-foreground">
          {cenarios.length} cenários mapeados · clique em um para ver acionamento, runbook,
          simulados e lições aprendidas.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            placeholder="Buscar código, nome ou descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {cats.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSev} onValueChange={setFilterSev}>
            <SelectTrigger>
              <SelectValue placeholder="Severidade mínima" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as severidades</SelectItem>
              <SelectItem value="5">Apenas críticas (5)</SelectItem>
              <SelectItem value="4">Alta ou acima (4+)</SelectItem>
              <SelectItem value="3">Média ou acima (3+)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum cenário.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh label="Cód." sortKey="codigo" state={sortState} onToggle={toggleSort} className="w-[80px]" />
                  <SortableTh label="Cenário" sortKey="nome" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Categoria" sortKey="categoria" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Sev." sortKey="severidade" state={sortState} onToggle={toggleSort} className="text-center" />
                  <SortableTh label="Prob." sortKey="probabilidade" state={sortState} onToggle={toggleSort} className="text-center" />
                  <SortableTh label="Score" sortKey="score" state={sortState} onToggle={toggleSort} className="text-center" />
                  <SortableTh label="Coordenador" sortKey="coordenador" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Status" sortKey="status" state={sortState} onToggle={toggleSort} />
                  <th className="whitespace-nowrap p-2 text-left text-xs font-semibold">
                    Artefatos
                  </th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((c) => {
                  const score = (c.severidade ?? 0) * (c.probabilidade ?? 0);
                  const catColor = CATEGORIA_COR[c.categoria ?? ""] ?? "#64748b";
                  const statusColor = STATUS_CENARIO_COLOR[c.status] ?? "#64748b";
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-semibold">
                        <Link
                          href={`/gestao-crises/cenarios/${c.id}`}
                          className="hover:underline"
                        >
                          {c.codigo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/gestao-crises/cenarios/${c.id}`}
                          className="hover:underline"
                        >
                          <div className="font-medium">{c.nome}</div>
                          {c.risco_codigo && (
                            <div className="text-[10px] text-muted-foreground">
                              vinculado ao risco{" "}
                              <span className="font-mono">{c.risco_codigo}</span>
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-block rounded px-2 py-0.5 text-[11px] font-medium capitalize"
                          style={{
                            backgroundColor: `${catColor}22`,
                            color: catColor,
                          }}
                        >
                          {c.categoria ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs">{c.severidade ?? "—"}</TableCell>
                      <TableCell className="text-center text-xs">{c.probabilidade ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold">{score}</span>
                      </TableCell>
                      <TableCell className="text-xs">{c.coordenador_nome ?? "—"}</TableCell>
                      <TableCell>
                        <span
                          className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                          style={{
                            backgroundColor: `${statusColor}22`,
                            color: statusColor,
                          }}
                        >
                          {c.status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        <div>{c.n_acionamentos} acion · {c.n_runbooks} runbk</div>
                        <div>
                          {c.n_simulados} simul · {c.n_licoes} lições
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
