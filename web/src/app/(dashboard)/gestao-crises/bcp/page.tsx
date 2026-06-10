"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTh, useSortedRows } from "@/components/riscos/sortable-table";
import {
  fetchProcessosCriticos,
  type ProcessoCritico,
} from "@/lib/crises-api";

type SortKey =
  | "codigo"
  | "nome"
  | "area"
  | "prioridade"
  | "rto"
  | "rpo"
  | "mtd"
  | "impacto"
  | "responsavel";

export default function BcpPage() {
  const [procs, setProcs] = useState<ProcessoCritico[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProcessosCriticos().then(setProcs);
  }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    if (!t) return procs;
    return procs.filter(
      (p) =>
        p.codigo.toLowerCase().includes(t) ||
        p.nome.toLowerCase().includes(t) ||
        (p.area ?? "").toLowerCase().includes(t),
    );
  }, [procs, search]);

  const { sorted, sortState, toggleSort } = useSortedRows<ProcessoCritico, SortKey>(
    filtered,
    {
      codigo: (p) => p.codigo,
      nome: (p) => p.nome,
      area: (p) => p.area ?? "",
      prioridade: (p) => p.prioridade,
      rto: (p) => p.rto_horas ?? 1e9,
      rpo: (p) => p.rpo_horas ?? 1e9,
      mtd: (p) => p.mtd_horas ?? 1e9,
      impacto: (p) => p.impacto_financeiro_hora ?? 0,
      responsavel: (p) => p.responsavel_nome ?? "",
    },
    { key: "prioridade", dir: "desc" },
  );

  const totalExposicao = procs.reduce(
    (sum, p) => sum + (p.impacto_financeiro_hora ?? 0),
    0,
  );
  const fmtBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  const fmtHrs = (v: number | null | undefined) =>
    v == null ? "—" : v < 24 ? `${v}h` : `${Math.round(v / 24)}d`;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          BCP — Processos Críticos (BIA)
        </h1>
        <p className="text-sm text-muted-foreground">
          ISO 22301 — Business Impact Analysis dos processos mais críticos. RTO (Recovery
          Time Objective) · RPO (Recovery Point Objective) · MTD (Max Tolerable Downtime).
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Processos críticos" value={procs.length} />
        <Kpi
          label="Prioridade alta/crítica"
          value={procs.filter((p) => p.prioridade >= 4).length}
          accent="#dc2626"
        />
        <Kpi
          label="Exposição / hora"
          value={fmtBRL(totalExposicao)}
          isString
          accent="#f59e0b"
        />
        <Kpi
          label="Com plano de recuperação"
          value={procs.filter((p) => p.n_planos > 0).length}
          accent="#16a34a"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar código, nome ou área…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum processo.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh label="Cód." sortKey="codigo" state={sortState} onToggle={toggleSort} className="w-[80px]" />
                  <SortableTh label="Processo" sortKey="nome" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Área" sortKey="area" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Prioridade" sortKey="prioridade" state={sortState} onToggle={toggleSort} className="text-center" />
                  <SortableTh label="RTO" sortKey="rto" state={sortState} onToggle={toggleSort} className="text-center" />
                  <SortableTh label="RPO" sortKey="rpo" state={sortState} onToggle={toggleSort} className="text-center" />
                  <SortableTh label="MTD" sortKey="mtd" state={sortState} onToggle={toggleSort} className="text-center" />
                  <SortableTh label="Impacto/hora" sortKey="impacto" state={sortState} onToggle={toggleSort} className="text-right" />
                  <SortableTh label="Responsável" sortKey="responsavel" state={sortState} onToggle={toggleSort} />
                  <th className="p-2 text-center text-xs font-semibold">Planos</th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p) => {
                  const prioColor =
                    p.prioridade === 5
                      ? "#dc2626"
                      : p.prioridade === 4
                      ? "#f59e0b"
                      : p.prioridade === 3
                      ? "#0ea5e9"
                      : "#64748b";
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-semibold">
                        <Link
                          href={`/gestao-crises/bcp/${p.id}`}
                          className="hover:underline"
                        >
                          {p.codigo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/gestao-crises/bcp/${p.id}`}
                          className="hover:underline"
                        >
                          {p.nome}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{p.area ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className="inline-block rounded px-2 py-0.5 text-xs font-bold text-white"
                          style={{ backgroundColor: prioColor }}
                        >
                          P{p.prioridade}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs">{fmtHrs(p.rto_horas)}</TableCell>
                      <TableCell className="text-center text-xs">{fmtHrs(p.rpo_horas)}</TableCell>
                      <TableCell className="text-center text-xs">{fmtHrs(p.mtd_horas)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {p.impacto_financeiro_hora ? fmtBRL(p.impacto_financeiro_hora) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{p.responsavel_nome ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        {p.n_planos > 0 ? (
                          <span className="rounded bg-green-500/20 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                            {p.n_planos}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
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

function Kpi({
  label,
  value,
  accent,
  isString,
}: {
  label: string;
  value: number | string;
  accent?: string;
  isString?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={`mt-1 font-bold ${isString ? "text-lg" : "text-3xl"}`}
          style={{ color: accent }}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
