"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CATEGORIA_ERM_COR,
  fetchCategoriasERM,
  fetchDashboardCorporativo,
  type CategoriaERM,
  type DashboardCorporativo,
} from "@/lib/corporativo-api";

export default function TaxonomiaERMPage() {
  const [cats, setCats] = useState<CategoriaERM[]>([]);
  const [dash, setDash] = useState<DashboardCorporativo | null>(null);

  useEffect(() => {
    fetchCategoriasERM().then(setCats);
    fetchDashboardCorporativo().then(setDash);
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Taxonomia COSO ERM 2017
        </h1>
        <p className="text-sm text-muted-foreground">
          5 categorias clássicas de risco do <strong>COSO Enterprise Risk Management 2017</strong>:
          Estratégico, Operacional, Financeiro, Reportes e Conformidade. Cada risco
          corporativo é classificado em uma das cinco.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cats.map((c) => {
          const info = dash?.por_categoria_erm[c.codigo];
          const cor = c.cor ?? CATEGORIA_ERM_COR[c.codigo] ?? "#64748b";
          return (
            <Card key={c.id} className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-14 items-center justify-center rounded text-lg font-bold text-white"
                      style={{ backgroundColor: cor }}
                    >
                      {c.codigo}
                    </span>
                    <div>
                      <CardTitle className="text-base">{c.nome}</CardTitle>
                    </div>
                  </div>
                  {info && (
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: cor }}>
                        {info.n}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        riscos {info.criticos > 0 && `(${info.criticos} críticos)`}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{c.descricao}</p>
                <Link
                  href={`/gestao-riscos/riscos?categoria_erm_id=${c.id}&tipo_escopo=corporativo`}
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                >
                  Ver riscos →
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
