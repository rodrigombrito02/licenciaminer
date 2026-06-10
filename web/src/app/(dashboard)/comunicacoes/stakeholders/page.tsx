"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Phone } from "lucide-react";
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
  TIPO_COR,
  fetchStakeholders,
  type Stakeholder,
} from "@/lib/comunicacoes-api";

type SortKey = "nome" | "tipo" | "organizacao" | "cargo" | "criticidade";

export default function StakeholdersPage() {
  const [items, setItems] = useState<Stakeholder[]>([]);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");

  useEffect(() => {
    fetchStakeholders().then(setItems);
  }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return items.filter((s) => {
      if (filterTipo !== "all" && s.tipo !== filterTipo) return false;
      if (!t) return true;
      return (
        s.nome.toLowerCase().includes(t) ||
        (s.organizacao ?? "").toLowerCase().includes(t) ||
        (s.cargo ?? "").toLowerCase().includes(t)
      );
    });
  }, [items, search, filterTipo]);

  const { sorted, sortState, toggleSort } = useSortedRows<Stakeholder, SortKey>(
    filtered,
    {
      nome: (s) => s.nome,
      tipo: (s) => s.tipo,
      organizacao: (s) => s.organizacao ?? "",
      cargo: (s) => s.cargo ?? "",
      criticidade: (s) => s.criticidade,
    },
    { key: "criticidade", dir: "desc" },
  );

  const tipos = Array.from(new Set(items.map((s) => s.tipo)));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Stakeholders</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} stakeholders mapeados. Os de maior criticidade devem ser
          tratados como prioridade em qualquer comunicação de crise.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            placeholder="Buscar nome, organização ou cargo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTh label="Nome" sortKey="nome" state={sortState} onToggle={toggleSort} />
                <SortableTh label="Tipo" sortKey="tipo" state={sortState} onToggle={toggleSort} />
                <SortableTh label="Organização" sortKey="organizacao" state={sortState} onToggle={toggleSort} />
                <SortableTh label="Cargo" sortKey="cargo" state={sortState} onToggle={toggleSort} />
                <th className="p-2 text-xs font-semibold">Contatos</th>
                <SortableTh label="Criticidade" sortKey="criticidade" state={sortState} onToggle={toggleSort} className="text-center" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((s) => {
                const cor = TIPO_COR[s.tipo] ?? "#64748b";
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nome}</TableCell>
                    <TableCell>
                      <span
                        className="inline-block rounded px-2 py-0.5 text-[11px] font-medium capitalize"
                        style={{
                          backgroundColor: `${cor}22`,
                          color: cor,
                        }}
                      >
                        {s.tipo}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{s.organizacao ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.cargo ?? "—"}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {s.contato_email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {s.contato_email}
                        </div>
                      )}
                      {s.contato_telefone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {s.contato_telefone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor:
                                n <= s.criticidade ? "#dc2626" : "#e2e8f0",
                            }}
                          />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
