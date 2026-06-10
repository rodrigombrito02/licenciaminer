"use client";

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
import { fetchEnvios, type Envio } from "@/lib/comunicacoes-api";

type SortKey =
  | "data_envio"
  | "assunto"
  | "canal"
  | "stakeholder"
  | "template"
  | "enviado_por"
  | "resultado";

export default function EnviosPage() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchEnvios({ limit: 500 }).then(setEnvios);
  }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    if (!t) return envios;
    return envios.filter(
      (e) =>
        (e.assunto ?? "").toLowerCase().includes(t) ||
        (e.stakeholder_nome ?? "").toLowerCase().includes(t) ||
        (e.template_codigo ?? "").toLowerCase().includes(t),
    );
  }, [envios, search]);

  const { sorted, sortState, toggleSort } = useSortedRows<Envio, SortKey>(
    filtered,
    {
      data_envio: (e) => e.data_envio,
      assunto: (e) => e.assunto ?? "",
      canal: (e) => e.canal,
      stakeholder: (e) => e.stakeholder_nome ?? "",
      template: (e) => e.template_codigo ?? "",
      enviado_por: (e) => e.enviado_por ?? "",
      resultado: (e) => e.resultado,
    },
    { key: "data_envio", dir: "desc" },
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Envios registrados
        </h1>
        <p className="text-sm text-muted-foreground">
          Histórico completo de comunicações emitidas. {envios.length} registros.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar assunto, stakeholder ou template…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sem envios.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh label="Data" sortKey="data_envio" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Assunto" sortKey="assunto" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Canal" sortKey="canal" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Stakeholder" sortKey="stakeholder" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Template" sortKey="template" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Enviado por" sortKey="enviado_por" state={sortState} onToggle={toggleSort} />
                  <SortableTh label="Resultado" sortKey="resultado" state={sortState} onToggle={toggleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.data_envio}</TableCell>
                    <TableCell>{e.assunto ?? "—"}</TableCell>
                    <TableCell className="text-xs">{e.canal}</TableCell>
                    <TableCell className="text-xs">{e.stakeholder_nome ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{e.template_codigo ?? "—"}</TableCell>
                    <TableCell className="text-xs">{e.enviado_por ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          e.resultado === "confirmado"
                            ? "bg-green-500/20 text-green-700"
                            : e.resultado === "enviado"
                            ? "bg-blue-500/20 text-blue-700"
                            : e.resultado === "falha"
                            ? "bg-red-500/20 text-red-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {e.resultado}
                      </span>
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
