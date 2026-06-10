"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PERSPECTIVA_BSC_COR,
  PERSPECTIVA_BSC_LABEL,
  fetchObjetivos,
  type Objetivo,
} from "@/lib/corporativo-api";

export default function ObjetivosPage() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);

  useEffect(() => {
    fetchObjetivos().then(setObjetivos);
  }, []);

  // Agrupa por perspectiva BSC
  const grupos: Record<string, Objetivo[]> = {};
  for (const o of objetivos) {
    (grupos[o.perspectiva_bsc] ??= []).push(o);
  }

  const ordemBSC = ["financeira", "cliente", "processos_internos", "aprendizado", "esg"];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Objetivos Estratégicos (BSC)
        </h1>
        <p className="text-sm text-muted-foreground">
          COSO ERM 2017 integra estratégia + performance. Cada risco corporativo é
          mapeado para um ou mais objetivos que ele ameaça (ou favorece, no caso de
          oportunidades). {objetivos.length} objetivos ativos.
        </p>
      </header>

      <div className="space-y-4">
        {ordemBSC.map((persp) => {
          const lista = grupos[persp] ?? [];
          if (lista.length === 0) return null;
          const cor = PERSPECTIVA_BSC_COR[persp] ?? "#64748b";
          return (
            <div key={persp}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded"
                  style={{ backgroundColor: cor }}
                />
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Perspectiva {PERSPECTIVA_BSC_LABEL[persp] ?? persp}
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({lista.length} objetivo{lista.length > 1 ? "s" : ""})
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {lista.map((o) => (
                  <Link
                    key={o.id}
                    href={`/riscos-corporativos/objetivos/${o.id}`}
                    className="block no-underline"
                  >
                    <Card className="h-full transition hover:border-primary/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {o.codigo}
                            </div>
                            <CardTitle className="text-sm leading-tight">
                              {o.descricao}
                            </CardTitle>
                          </div>
                          <div
                            className={`rounded px-2 py-0.5 text-xs font-bold ${
                              (o.n_riscos_ameacando ?? 0) === 0
                                ? "bg-muted text-muted-foreground"
                                : (o.n_riscos_ameacando ?? 0) >= 3
                                ? "bg-red-500/20 text-red-700"
                                : "bg-yellow-500/20 text-yellow-700"
                            }`}
                          >
                            {o.n_riscos_ameacando ?? 0} risco(s)
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-1 text-xs">
                        {o.meta && (
                          <p className="line-clamp-2 text-muted-foreground">{o.meta}</p>
                        )}
                        {o.indicador && (
                          <div className="flex flex-wrap gap-1">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                              📊 {o.indicador}
                              {o.valor_meta != null
                                ? ` = ${o.valor_meta} ${o.unidade_meta ?? ""}`
                                : ""}
                            </span>
                            {o.horizonte && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize">
                                ⏱ {o.horizonte}
                              </span>
                            )}
                            {o.responsavel_nome && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                                👤 {o.responsavel_nome}
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
