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
import { fetchTemplates, type TemplateComunicacao } from "@/lib/comunicacoes-api";

const CATEGORIA_COR: Record<string, string> = {
  deteccao: "#dc2626",
  resolucao: "#f59e0b",
  pos_evento: "#8b5cf6",
  rotina: "#0ea5e9",
  crise: "#dc2626",
  regulatorio: "#16a34a",
  comunidades: "#f97316",
};

export default function TemplatesPage() {
  const [items, setItems] = useState<TemplateComunicacao[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  useEffect(() => {
    fetchTemplates().then(setItems);
  }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return items.filter((x) => {
      if (filterCat !== "all" && x.categoria !== filterCat) return false;
      if (!t) return true;
      return (
        x.codigo.toLowerCase().includes(t) ||
        x.titulo.toLowerCase().includes(t) ||
        x.corpo.toLowerCase().includes(t)
      );
    });
  }, [items, search, filterCat]);

  const cats = Array.from(new Set(items.map((x) => x.categoria).filter(Boolean))) as string[];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Templates de comunicação
        </h1>
        <p className="text-sm text-muted-foreground">
          {items.length} templates padronizados para uso em cenários de crise, eventos
          operacionais e comunicação rotineira. Placeholders no formato{" "}
          <code className="rounded bg-muted px-1">{"{nome_campo}"}</code> são substituídos
          no envio.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            placeholder="Buscar código, título ou conteúdo…"
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
                  {c.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {filtered.map((t) => {
          const cor = CATEGORIA_COR[t.categoria ?? ""] ?? "#64748b";
          return (
            <Link
              key={t.id}
              href={`/comunicacoes/templates/${t.id}`}
              className="block no-underline"
            >
              <Card className="h-full transition hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {t.codigo}
                      </div>
                      <CardTitle className="text-sm leading-tight">
                        {t.titulo}
                      </CardTitle>
                    </div>
                    {t.categoria && (
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                        style={{
                          backgroundColor: `${cor}22`,
                          color: cor,
                        }}
                      >
                        {t.categoria.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p className="line-clamp-3 text-muted-foreground">
                    {t.corpo.slice(0, 200)}…
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {t.canal_sugerido && (
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px]">
                        📡 {t.canal_sugerido}
                      </span>
                    )}
                    {t.publicos_sugeridos && (
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px]">
                        👥 {t.publicos_sugeridos.slice(0, 50)}
                        {t.publicos_sugeridos.length > 50 ? "…" : ""}
                      </span>
                    )}
                    {t.aprovacao_juridica && (
                      <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-700">
                        ⚖ aprovação jurídica
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
