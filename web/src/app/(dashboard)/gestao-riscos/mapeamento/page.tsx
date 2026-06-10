"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  atualizarRisco,
  fetchCadeiaValor,
  fetchRiscos,
  fetchUnidadesOrg,
  type EloCadeiaValor,
  type Risco,
  type UnidadeOrg,
} from "@/lib/riscos-api";

type FiltroCobertura = "todos" | "sem_org" | "sem_cadeia" | "sem_ambos";

export default function MapeamentoPage() {
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOrg[]>([]);
  const [elos, setElos] = useState<EloCadeiaValor[]>([]);
  const [filtro, setFiltro] = useState<FiltroCobertura>("sem_ambos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const reload = () => {
    Promise.all([fetchRiscos(), fetchUnidadesOrg(), fetchCadeiaValor()]).then(
      ([r, u, e]) => {
        setRiscos(r);
        setUnidades(u);
        setElos(e);
        setLoading(false);
      },
    );
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return riscos.filter((r) => {
      if (filtro === "sem_org" && r.unidade_org_id) return false;
      if (filtro === "sem_cadeia" && r.elo_cadeia_valor_id) return false;
      if (filtro === "sem_ambos" && r.unidade_org_id && r.elo_cadeia_valor_id)
        return false;
      if (!t) return true;
      return (
        r.codigo.toLowerCase().includes(t) ||
        r.nome.toLowerCase().includes(t) ||
        (r.descricao ?? "").toLowerCase().includes(t)
      );
    });
  }, [riscos, search, filtro]);

  const totais = useMemo(() => {
    const total = riscos.length;
    const com_org = riscos.filter((r) => r.unidade_org_id).length;
    const com_cadeia = riscos.filter((r) => r.elo_cadeia_valor_id).length;
    const com_ambos = riscos.filter(
      (r) => r.unidade_org_id && r.elo_cadeia_valor_id,
    ).length;
    return {
      total,
      com_org,
      com_cadeia,
      com_ambos,
      sem_ambos: total - com_ambos,
    };
  }, [riscos]);

  // Sugestão heurística local: procura unidade/elo cujo nome contém palavras do risco/categoria
  const sugerir = (risco: Risco) => {
    const texto = (
      (risco.categoria_nome ?? "") +
      " " +
      (risco.nome ?? "") +
      " " +
      (risco.descricao ?? "")
    ).toLowerCase();
    const termos = texto.split(/\s+/).filter((p) => p.length > 3);
    const findByMatch = <T extends { nome: string }>(lista: T[]) => {
      for (const item of lista) {
        const nomeLower = item.nome.toLowerCase();
        for (const termo of termos) {
          if (nomeLower.includes(termo) || termo.includes(nomeLower.split(" ")[0])) {
            return item;
          }
        }
      }
      return null;
    };
    const unidadeSug = !risco.unidade_org_id ? findByMatch(unidades) : null;
    const eloSug = !risco.elo_cadeia_valor_id ? findByMatch(elos) : null;
    return { unidade_sug: unidadeSug, elo_sug: eloSug };
  };

  const salvar = async (
    id: number,
    patch: { unidade_org_id?: number | null; elo_cadeia_valor_id?: number | null },
  ) => {
    setSaving(id);
    try {
      await atualizarRisco(id, patch);
      reload();
    } finally {
      setSaving(null);
    }
  };

  const aplicarSugestoes = async () => {
    if (!confirm(`Aplicar sugestões heurísticas a ${filtered.length} riscos?`)) return;
    for (const r of filtered) {
      const { unidade_sug, elo_sug } = sugerir(r);
      const patch: { unidade_org_id?: number; elo_cadeia_valor_id?: number } = {};
      if (unidade_sug && !r.unidade_org_id) patch.unidade_org_id = unidade_sug.id;
      if (elo_sug && !r.elo_cadeia_valor_id) patch.elo_cadeia_valor_id = elo_sug.id;
      if (Object.keys(patch).length > 0) {
        await atualizarRisco(r.id, patch);
      }
    }
    reload();
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Mapeamento de riscos → organograma + cadeia de valor
        </h1>
        <p className="text-sm text-muted-foreground">
          Associe cada risco a uma unidade organizacional e a um elo da cadeia de valor
          para habilitar as visões correspondentes e cobertura de apetite.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total de riscos" value={totais.total} />
        <Stat
          label="Com organograma"
          value={totais.com_org}
          sub={`${Math.round((totais.com_org / Math.max(1, totais.total)) * 100)}% cobertura`}
          accent={totais.com_org === totais.total ? "#16a34a" : "#eab308"}
        />
        <Stat
          label="Com cadeia de valor"
          value={totais.com_cadeia}
          sub={`${Math.round((totais.com_cadeia / Math.max(1, totais.total)) * 100)}% cobertura`}
          accent={totais.com_cadeia === totais.total ? "#16a34a" : "#eab308"}
        />
        <Stat
          label="Ambos mapeados"
          value={totais.com_ambos}
          accent={totais.com_ambos === totais.total ? "#16a34a" : "#eab308"}
        />
        <Stat
          label="Sem mapeamento completo"
          value={totais.sem_ambos}
          accent={totais.sem_ambos > 0 ? "#dc2626" : "#16a34a"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Filtros</CardTitle>
          <Button onClick={aplicarSugestoes} variant="outline">
            ⚙ Aplicar sugestões heurísticas em lote ({filtered.length})
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            placeholder="Buscar código, nome ou descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filtro} onValueChange={(v) => setFiltro(v as FiltroCobertura)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sem_ambos">Sem mapeamento completo</SelectItem>
              <SelectItem value="sem_org">Sem unidade organizacional</SelectItem>
              <SelectItem value="sem_cadeia">Sem elo da cadeia de valor</SelectItem>
              <SelectItem value="todos">Todos os riscos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {filtro === "sem_ambos" && riscos.length > 0
                ? "Todos os riscos filtrados estão completamente mapeados."
                : "Nenhum risco."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="w-[240px]">Unidade Organizacional</TableHead>
                  <TableHead className="w-[240px]">Elo da Cadeia de Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const sug = sugerir(r);
                  const isSaving = saving === r.id;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-semibold">
                        <Link
                          href={`/gestao-riscos/riscos/${r.id}`}
                          className="hover:underline"
                        >
                          {r.codigo}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <span className="line-clamp-2 text-xs">{r.nome}</span>
                      </TableCell>
                      <TableCell className="text-[11px]">
                        {r.categoria_nome ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Select
                            value={r.unidade_org_id ? String(r.unidade_org_id) : "none"}
                            onValueChange={(v) =>
                              salvar(r.id, {
                                unidade_org_id: v === "none" ? null : Number(v),
                              })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="—">
                                {r.unidade_org_nome ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    <span className="truncate">{r.unidade_org_nome}</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                    sem mapeamento
                                  </span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {unidades.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)}>
                                  {"·".repeat(u.nivel)} {u.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!r.unidade_org_id && sug.unidade_sug && (
                            <button
                              type="button"
                              onClick={() =>
                                salvar(r.id, {
                                  unidade_org_id: sug.unidade_sug!.id,
                                })
                              }
                              disabled={isSaving}
                              className="rounded bg-blue-500/10 px-2 py-0.5 text-left text-[10px] text-blue-700 hover:bg-blue-500/20 disabled:opacity-50"
                            >
                              💡 Sugestão: {sug.unidade_sug.nome}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Select
                            value={
                              r.elo_cadeia_valor_id
                                ? String(r.elo_cadeia_valor_id)
                                : "none"
                            }
                            onValueChange={(v) =>
                              salvar(r.id, {
                                elo_cadeia_valor_id: v === "none" ? null : Number(v),
                              })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="—">
                                {r.elo_cadeia_valor_nome ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    <span className="truncate">
                                      {r.elo_cadeia_valor_nome}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                    sem mapeamento
                                  </span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {elos.map((e) => (
                                <SelectItem key={e.id} value={String(e.id)}>
                                  [{e.tipo}] {e.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!r.elo_cadeia_valor_id && sug.elo_sug && (
                            <button
                              type="button"
                              onClick={() =>
                                salvar(r.id, {
                                  elo_cadeia_valor_id: sug.elo_sug!.id,
                                })
                              }
                              disabled={isSaving}
                              className="rounded bg-blue-500/10 px-2 py-0.5 text-left text-[10px] text-blue-700 hover:bg-blue-500/20 disabled:opacity-50"
                            >
                              💡 Sugestão: {sug.elo_sug.nome}
                            </button>
                          )}
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

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-bold" style={{ color: accent }}>
          {value}
        </div>
        {sub && <div className="text-[9px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
