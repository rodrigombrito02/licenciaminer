"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { fetchSimulados, type Simulado } from "@/lib/crises-api";

const TIPO_COLOR: Record<string, string> = {
  tabletop: "#0ea5e9",
  funcional: "#8b5cf6",
  full_scale: "#dc2626",
};

const STATUS_COLOR: Record<string, string> = {
  planejado: "#64748b",
  em_execucao: "#3b82f6",
  concluido: "#16a34a",
  cancelado: "#9ca3af",
};

type SortKey =
  | "data_prevista"
  | "titulo"
  | "cenario"
  | "tipo"
  | "status"
  | "facilitador"
  | "nota";

export default function SimuladosPage() {
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");

  const reload = () => {
    fetchSimulados(filterStatus === "all" ? undefined : filterStatus).then(setSimulados);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const { sorted, sortState, toggleSort } = useSortedRows<Simulado, SortKey>(
    simulados,
    {
      data_prevista: (s) => s.data_prevista ?? "",
      titulo: (s) => s.titulo,
      cenario: (s) => s.cenario_codigo ?? "",
      tipo: (s) => s.tipo,
      status: (s) => s.status,
      facilitador: (s) => s.facilitador_nome ?? "",
      nota: (s) => s.nota_performance ?? -1,
    },
    { key: "data_prevista", dir: "asc" },
  );

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byTipo: Record<string, number> = {};
    for (const s of simulados) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      byTipo[s.tipo] = (byTipo[s.tipo] ?? 0) + 1;
    }
    return { byStatus, byTipo };
  }, [simulados]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Simulados e exercícios</h1>
        <p className="text-sm text-muted-foreground">
          Tabletops, exercícios funcionais e simulados full-scale para testar cenários de
          crise e planos de continuidade.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total" value={simulados.length} />
        <Kpi
          label="Planejados"
          value={stats.byStatus.planejado ?? 0}
          accent="#64748b"
        />
        <Kpi
          label="Concluídos"
          value={stats.byStatus.concluido ?? 0}
          accent="#16a34a"
        />
        <Kpi
          label="Em execução"
          value={stats.byStatus.em_execucao ?? 0}
          accent="#3b82f6"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtro</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="planejado">Planejado</SelectItem>
              <SelectItem value="em_execucao">Em execução</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum simulado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh label="Data prevista" sortKey="data_prevista" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Título" sortKey="titulo" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Cenário" sortKey="cenario" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Tipo" sortKey="tipo" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Status" sortKey="status" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Facilitador" sortKey="facilitador" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Nota" sortKey="nota" state={sortState} onToggle={toggleSort} className="text-center" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((s) => {
                  const tipoColor = TIPO_COLOR[s.tipo] ?? "#64748b";
                  const statusColor = STATUS_COLOR[s.status] ?? "#64748b";
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-mono">
                        {s.data_prevista ?? "—"}
                      </TableCell>
                      <TableCell>
                        {s.cenario_id ? (
                          <Link
                            href={`/gestao-crises/cenarios/${s.cenario_id}`}
                            className="hover:underline"
                          >
                            {s.titulo}
                          </Link>
                        ) : (
                          s.titulo
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">
                        {s.cenario_codigo ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-block rounded px-2 py-0.5 text-[10px] uppercase"
                          style={{
                            backgroundColor: `${tipoColor}22`,
                            color: tipoColor,
                          }}
                        >
                          {s.tipo.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                          style={{
                            backgroundColor: `${statusColor}22`,
                            color: statusColor,
                          }}
                        >
                          {s.status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{s.facilitador_nome ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        {s.nota_performance ? (
                          <span className="font-bold text-primary">
                            {s.nota_performance}/5
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
