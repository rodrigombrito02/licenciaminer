"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowUp, Minus } from "lucide-react";
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
  STATUS_KRI_COLOR,
  fetchKRIDashboard,
  fetchKRIs,
  type KRI,
  type KRIsDashboard,
} from "@/lib/monitoramento-api";

type SortKey =
  | "codigo"
  | "nome"
  | "categoria"
  | "responsavel"
  | "ultimo_valor"
  | "ultimo_status"
  | "periodicidade";

const STATUS_RANK: Record<string, number> = {
  vermelho: 4,
  amarelo: 3,
  verde: 2,
  sem_dados: 1,
};

export default function KRIsPage() {
  const [kris, setKris] = useState<KRI[]>([]);
  const [dash, setDash] = useState<KRIsDashboard | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    Promise.all([fetchKRIs(), fetchKRIDashboard()]).then(([k, d]) => {
      setKris(k);
      setDash(d);
    });
  }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return kris.filter((k) => {
      if (filterStatus !== "all" && k.ultimo_status !== filterStatus) return false;
      if (!t) return true;
      return (
        k.codigo.toLowerCase().includes(t) ||
        k.nome.toLowerCase().includes(t) ||
        (k.descricao ?? "").toLowerCase().includes(t)
      );
    });
  }, [kris, search, filterStatus]);

  const { sorted, sortState, toggleSort } = useSortedRows<KRI, SortKey>(
    filtered,
    {
      codigo: (k) => k.codigo,
      nome: (k) => k.nome,
      categoria: (k) => k.categoria_nome ?? "",
      responsavel: (k) => k.responsavel_nome ?? "",
      ultimo_valor: (k) => k.ultimo_valor ?? -Infinity,
      ultimo_status: (k) => STATUS_RANK[k.ultimo_status ?? "sem_dados"] ?? 0,
      periodicidade: (k) => k.periodicidade,
    },
    { key: "ultimo_status", dir: "desc" },
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          KRIs — Indicadores-Chave de Risco
        </h1>
        <p className="text-sm text-muted-foreground">
          ISO 31000 — monitoramento quantitativo contínuo dos riscos. Cada indicador tem
          thresholds verde/amarelo/vermelho definidos para gerar alertas automáticos.
        </p>
      </header>

      {dash && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <BigNumber label="Total de KRIs" value={dash.total} />
          <BigNumber
            label="Em verde"
            value={dash.status_count.verde ?? 0}
            accent={STATUS_KRI_COLOR.verde}
          />
          <BigNumber
            label="Em amarelo"
            value={dash.status_count.amarelo ?? 0}
            accent={STATUS_KRI_COLOR.amarelo}
          />
          <BigNumber
            label="Em vermelho"
            value={dash.status_count.vermelho ?? 0}
            accent={STATUS_KRI_COLOR.vermelho}
          />
          <BigNumber
            label="Sem dados"
            value={dash.status_count.sem_dados ?? 0}
            accent={STATUS_KRI_COLOR.sem_dados}
          />
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            placeholder="Buscar código, nome ou descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="vermelho">Vermelho</SelectItem>
              <SelectItem value="amarelo">Amarelo</SelectItem>
              <SelectItem value="verde">Verde</SelectItem>
              <SelectItem value="sem_dados">Sem dados</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum KRI.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh label="Cód." sortKey="codigo" state={sortState} onToggle={toggleSort} className="w-[80px]" />
                  <SortableTh label="Indicador" sortKey="nome" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Categoria" sortKey="categoria" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Responsável" sortKey="responsavel" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Último valor" sortKey="ultimo_valor" state={sortState} onToggle={toggleSort} className="text-right" />
                  <th className="p-2 text-center text-xs font-semibold">Tendência</th>
                  <SortableTh label="Status" sortKey="ultimo_status" state={sortState} onToggle={toggleSort} className="text-center" />
                  <SortableTh label="Periodicidade" sortKey="periodicidade" state={sortState} onToggle={toggleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((k) => {
                  const statusColor = STATUS_KRI_COLOR[k.ultimo_status ?? "sem_dados"];
                  return (
                    <TableRow key={k.id}>
                      <TableCell className="font-mono font-semibold">
                        <Link
                          href={`/gestao-riscos/kris/${k.id}`}
                          className="hover:underline"
                        >
                          {k.codigo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/gestao-riscos/kris/${k.id}`}
                          className="hover:underline"
                        >
                          <div className="font-medium">{k.nome}</div>
                          {k.risco_codigo && (
                            <div className="text-[10px] text-muted-foreground">
                              risco vinculado:{" "}
                              <span className="font-mono">{k.risco_codigo}</span>
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{k.categoria_nome ?? "—"}</TableCell>
                      <TableCell className="text-xs">{k.responsavel_nome ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {k.ultimo_valor ?? "—"} <span className="text-muted-foreground">{k.unidade}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {k.tendencia === "subindo" ? (
                          <ArrowUp
                            className={`mx-auto h-4 w-4 ${
                              k.direcao === "subir_pior" ? "text-red-500" : "text-green-500"
                            }`}
                          />
                        ) : k.tendencia === "descendo" ? (
                          <ArrowDown
                            className={`mx-auto h-4 w-4 ${
                              k.direcao === "descer_pior" ? "text-red-500" : "text-green-500"
                            }`}
                          />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                          style={{ backgroundColor: statusColor }}
                        >
                          {k.ultimo_status ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{k.periodicidade}</TableCell>
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
