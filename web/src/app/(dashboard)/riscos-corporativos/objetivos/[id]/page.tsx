"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassificacaoBadge } from "@/components/riscos/classificacao-badge";
import {
  PERSPECTIVA_BSC_COR,
  PERSPECTIVA_BSC_LABEL,
  fetchObjetivoDetalhe,
  type ObjetivoDetalhe,
} from "@/lib/corporativo-api";

export default function ObjetivoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = use(params);
  const id = Number(idStr);
  const [obj, setObj] = useState<ObjetivoDetalhe | null>(null);

  useEffect(() => {
    fetchObjetivoDetalhe(id).then(setObj);
  }, [id]);

  if (!obj) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const cor = PERSPECTIVA_BSC_COR[obj.perspectiva_bsc] ?? "#64748b";

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-muted-foreground">
          <Link href="/riscos-corporativos/objetivos" className="hover:underline">
            Objetivos
          </Link>{" "}
          / <span className="font-mono">{obj.codigo}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{obj.descricao}</h1>
          <span
            className="rounded px-3 py-1 text-xs font-bold uppercase text-white"
            style={{ backgroundColor: cor }}
          >
            {PERSPECTIVA_BSC_LABEL[obj.perspectiva_bsc] ?? obj.perspectiva_bsc}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini label="Horizonte" value={obj.horizonte ?? "—"} />
        <Mini label="Indicador" value={obj.indicador ?? "—"} />
        <Mini
          label="Meta"
          value={
            obj.valor_meta != null
              ? `${obj.valor_meta} ${obj.unidade_meta ?? ""}`
              : "—"
          }
        />
        <Mini label="Responsável" value={obj.responsavel_nome ?? "—"} />
      </div>

      {obj.meta && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Meta detalhada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{obj.meta}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Riscos vinculados ({obj.riscos_vinculados.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Riscos e oportunidades mapeados a este objetivo. COSO ERM: risco sempre
            em relação a um objetivo.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {obj.riscos_vinculados.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum risco vinculado.</p>
          ) : (
            obj.riscos_vinculados.map((r) => (
              <Link
                key={r.id}
                href={`/gestao-riscos/riscos/${r.id}`}
                className="flex items-center gap-3 rounded border border-border p-2 hover:border-primary/50"
              >
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.natureza === "oportunidade"
                      ? "bg-green-500/20 text-green-700"
                      : "bg-red-500/20 text-red-700"
                  }`}
                >
                  {r.natureza === "oportunidade" ? "OPORT." : "AMEAÇA"}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{r.codigo}</span>
                <span className="flex-1 text-sm">{r.nome}</span>
                <ClassificacaoBadge value={r.classificacao_residual} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
