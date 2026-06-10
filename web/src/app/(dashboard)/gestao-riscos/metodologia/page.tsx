"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CLASSIFICACAO_COLOR,
  CLASSIFICACAO_LABEL,
  type Classificacao,
  fetchMetodologiaAtiva,
  type Metodologia,
} from "@/lib/riscos-api";

export default function MetodologiaPage() {
  const [met, setMet] = useState<Metodologia | null>(null);
  const [catImpacto, setCatImpacto] = useState<string>("pessoal");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetodologiaAtiva().then((m) => {
      setMet(m);
      const cats = m.impacto.map((i) => i.categoria);
      if (cats.length > 0) setCatImpacto(cats[0]);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!met) return <p className="text-sm text-destructive">Metodologia não encontrada</p>;

  const cats = Array.from(new Set(met.impacto.map((i) => i.categoria)));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Metodologia — {met.nome}</h1>
        {met.descricao && (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{met.descricao}</p>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Escala de Probabilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            {met.probabilidade
              .sort((a, b) => a.nivel - b.nivel)
              .map((p) => (
                <div key={p.nivel} className="rounded border p-3">
                  <div className="text-[10px] text-muted-foreground">Nível {p.nivel}</div>
                  <div className="text-sm font-semibold">{p.label}</div>
                  {p.descricao && (
                    <div className="mt-1 text-xs text-muted-foreground">{p.descricao}</div>
                  )}
                  {(p.frequencia_anual_min != null || p.frequencia_anual_max != null) && (
                    <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                      {p.frequencia_anual_min ?? "0"}–
                      {p.frequencia_anual_max ?? "∞"} ev/ano
                    </div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Escala de Impacto</CardTitle>
            <p className="text-xs text-muted-foreground">
              Ternium define escalas por categoria (pessoal, infraestrutura, financeiro,
              ambiental, reputacional). Selecione abaixo para ver cada categoria.
            </p>
          </div>
          <div className="flex gap-1">
            {cats.map((c) => (
              <button
                key={c}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  catImpacto === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                onClick={() => setCatImpacto(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            {met.impacto
              .filter((i) => i.categoria === catImpacto)
              .sort((a, b) => a.nivel - b.nivel)
              .map((i) => (
                <div key={`${i.categoria}-${i.nivel}`} className="rounded border p-3">
                  <div className="text-[10px] text-muted-foreground">Nível {i.nivel}</div>
                  <div className="text-sm font-semibold">{i.label}</div>
                  {i.descricao && (
                    <div className="mt-1 text-xs text-muted-foreground">{i.descricao}</div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matriz 5×5 de classificação</CardTitle>
          <p className="text-xs text-muted-foreground">
            A classificação de cada célula é atribuída à combinação (Probabilidade ×
            Impacto).
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-[10px] text-muted-foreground">
                    P \ I
                  </th>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <th key={n} className="px-2 py-1 text-center">
                      I={n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[5, 4, 3, 2, 1].map((p) => (
                  <tr key={p}>
                    <td className="px-2 py-1 text-center font-semibold">P={p}</td>
                    {[1, 2, 3, 4, 5].map((i) => {
                      const cell = met.matriz.find(
                        (m) => m.prob === p && m.impacto === i,
                      );
                      const cls = cell?.classificacao as Classificacao | undefined;
                      return (
                        <td
                          key={i}
                          className="min-w-[70px] rounded p-2 text-center font-semibold text-white"
                          style={{
                            backgroundColor: cls ? CLASSIFICACAO_COLOR[cls] : "#e5e7eb",
                          }}
                        >
                          {cls ? `${cls}` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
            {(Object.keys(CLASSIFICACAO_LABEL) as Classificacao[]).map((c) => (
              <div key={c} className="flex items-center gap-1">
                <span
                  className="inline-block h-3 w-3 rounded"
                  style={{ backgroundColor: CLASSIFICACAO_COLOR[c] }}
                />
                <span>
                  {c} — {CLASSIFICACAO_LABEL[c]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
