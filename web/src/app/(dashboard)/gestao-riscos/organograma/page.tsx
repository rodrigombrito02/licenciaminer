"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeatmapCaixinha } from "@/components/riscos/heatmap-caixinha";
import {
  fetchRiscosPorOrganograma,
  type UnidadeComRiscos,
} from "@/lib/riscos-api";

export default function OrganogramaPage() {
  const [unidades, setUnidades] = useState<UnidadeComRiscos[]>([]);
  const [base, setBase] = useState<"pura" | "residual">("residual");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiscosPorOrganograma(base).then((us) => {
      setUnidades(us);
      setLoading(false);
    });
  }, [base]);

  // Agrupa por nível
  const niveis = unidades.reduce<Record<number, UnidadeComRiscos[]>>((acc, u) => {
    (acc[u.nivel] ??= []).push(u);
    return acc;
  }, {});
  const niveisOrdenados = Object.keys(niveis)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visão Organograma</h1>
          <p className="text-sm text-muted-foreground">
            Distribuição dos riscos por unidade organizacional (Usiminas Mineração —
            fictícia). Cor e número por classificação do risco mais alto.
          </p>
        </div>
        <Select value={base} onValueChange={(v) => setBase(v as "pura" | "residual")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="residual">Risco residual</SelectItem>
            <SelectItem value="pura">Risco puro</SelectItem>
          </SelectContent>
        </Select>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="space-y-4">
          {niveisOrdenados.map((n) => (
            <Card key={n}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
                  Nível {n}{" "}
                  {n === 0
                    ? "— Presidência"
                    : n === 1
                    ? "— Diretorias"
                    : n === 2
                    ? "— Gerências Gerais"
                    : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${n === 0 ? 220 : 180}px, 1fr))`,
                  }}
                >
                  {niveis[n].map((u) => (
                    <HeatmapCaixinha
                      key={u.id}
                      nome={u.nome}
                      subtitulo={u.tipo ?? undefined}
                      total={u.total_riscos}
                      distribuicao={u.distribuicao}
                      href={`/gestao-riscos/riscos?unidade_org_id=${u.id}`}
                      compact={n >= 2}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
