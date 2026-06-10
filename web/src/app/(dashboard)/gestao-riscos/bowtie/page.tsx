"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClassificacaoBadge } from "@/components/riscos/classificacao-badge";
import {
  CLASSIFICACAO_LABEL,
  CLASSIFICACAO_ORDER,
  fetchCategorias,
  fetchRiscos,
  type Categoria,
  type Classificacao,
  type Risco,
} from "@/lib/riscos-api";

type GroupBy = "estagio" | "categoria" | "classificacao" | "responsavel" | "none";

const CLASS_RANK: Record<string, number> = { C: 4, MS: 3, S: 2, PS: 1 };

export default function BowtieIndexPage() {
  const [riscos, setRiscos] = useState<Risco[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstagio, setFilterEstagio] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("estagio");

  useEffect(() => {
    Promise.all([fetchRiscos(), fetchCategorias()]).then(([rs, cs]) => {
      setRiscos(rs);
      setCategorias(cs);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return riscos.filter((r) => {
      if (filterEstagio !== "all" && r.estagio !== filterEstagio) return false;
      if (filterClass !== "all" && r.classificacao_residual !== filterClass) return false;
      if (filterCategoria !== "all" && String(r.categoria_id) !== filterCategoria)
        return false;
      if (!t) return true;
      return (
        r.codigo.toLowerCase().includes(t) ||
        r.nome.toLowerCase().includes(t) ||
        (r.descricao ?? "").toLowerCase().includes(t)
      );
    });
  }, [riscos, search, filterEstagio, filterClass, filterCategoria]);

  const groups = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", riscos: filtered }];
    }
    const map = new Map<string, Risco[]>();
    for (const r of filtered) {
      let key: string;
      if (groupBy === "estagio") key = r.estagio ?? "(sem estágio)";
      else if (groupBy === "categoria") key = r.categoria_nome ?? "(sem categoria)";
      else if (groupBy === "classificacao")
        key = r.classificacao_residual ?? "(não avaliado)";
      else key = r.responsavel_nome ?? "(sem responsável)";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    // Ordenação especial para classificação
    const sortedEntries = Array.from(map.entries()).sort(([a], [b]) => {
      if (groupBy === "classificacao") {
        return (CLASS_RANK[b] ?? 0) - (CLASS_RANK[a] ?? 0);
      }
      return a.localeCompare(b, "pt-BR");
    });
    return sortedEntries.map(([key, riscos]) => ({
      key,
      label: groupBy === "classificacao" ? CLASSIFICACAO_LABEL[key as Classificacao] ?? key : key,
      riscos,
    }));
  }, [filtered, groupBy]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Bowtie</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um risco para abrir o editor do bowtie. {filtered.length} de{" "}
          {riscos.length} riscos exibidos.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Navegação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input
            placeholder="Buscar código, nome ou descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterEstagio} onValueChange={setFilterEstagio}>
            <SelectTrigger>
              <SelectValue placeholder="Estágio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estágios</SelectItem>
              <SelectItem value="aprovacao">Aprovação</SelectItem>
              <SelectItem value="implantacao">Implantação</SelectItem>
              <SelectItem value="operacao">Operação</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger>
              <SelectValue placeholder="Classificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as classificações</SelectItem>
              {CLASSIFICACAO_ORDER.slice()
                .reverse()
                .map((c) => (
                  <SelectItem key={c} value={c}>
                    {c} — {CLASSIFICACAO_LABEL[c]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
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
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger>
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="estagio">Agrupar por estágio</SelectItem>
              <SelectItem value="categoria">Agrupar por categoria</SelectItem>
              <SelectItem value="classificacao">Agrupar por classificação</SelectItem>
              <SelectItem value="responsavel">Agrupar por responsável</SelectItem>
              <SelectItem value="none">Sem agrupamento</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key}>
              {groupBy !== "none" && (
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {g.label} <span className="text-muted-foreground/70">({g.riscos.length})</span>
                </h3>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {g.riscos.map((r) => (
                  <Link
                    key={r.id}
                    href={`/gestao-riscos/bowtie/${r.id}`}
                    className="block no-underline"
                  >
                    <Card className="h-full transition hover:border-primary/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-start justify-between gap-2 text-base">
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.codigo}
                          </span>
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="line-clamp-3 text-sm">{r.nome}</p>
                        <div className="flex items-center justify-between gap-2">
                          <ClassificacaoBadge value={r.classificacao_residual} />
                          {r.estagio && (
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px]">
                              {r.estagio}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                          {r.categoria_nome && (
                            <span
                              className="rounded px-1.5 py-0.5"
                              style={{
                                backgroundColor: `${r.categoria_cor ?? "#64748b"}22`,
                                color: r.categoria_cor ?? "#64748b",
                              }}
                            >
                              {r.categoria_nome}
                            </span>
                          )}
                          {r.responsavel_nome && (
                            <span>· {r.responsavel_nome}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Nenhum risco atende aos filtros atuais.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
