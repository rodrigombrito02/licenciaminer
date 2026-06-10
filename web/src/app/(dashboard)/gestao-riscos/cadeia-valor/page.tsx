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
  fetchRiscosPorCadeiaValor,
  type EloComRiscos,
} from "@/lib/riscos-api";

export default function CadeiaValorPage() {
  const [elos, setElos] = useState<EloComRiscos[]>([]);
  const [base, setBase] = useState<"pura" | "residual">("residual");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiscosPorCadeiaValor(base).then((es) => {
      setElos(es);
      setLoading(false);
    });
  }, [base]);

  const primarios = elos.filter((e) => e.tipo === "primario").sort((a, b) => a.ordem - b.ordem);
  const apoio = elos.filter((e) => e.tipo === "apoio").sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cadeia de Valor</h1>
          <p className="text-sm text-muted-foreground">
            Layout Porter (atividades primárias + apoio) com distribuição dos riscos
            associados a cada elo da mineração (Usiminas Mineração — fictícia).
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
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
                Atividades primárias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${primarios.length}, minmax(0, 1fr))`,
                }}
              >
                {primarios.map((e) => (
                  <HeatmapCaixinha
                    key={e.id}
                    nome={e.nome}
                    subtitulo={e.descricao ?? undefined}
                    total={e.total_riscos}
                    distribuicao={e.distribuicao}
                    href={`/gestao-riscos/riscos?elo_cadeia_valor_id=${e.id}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
                Atividades de apoio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {apoio.map((e) => (
                  <HeatmapCaixinha
                    key={e.id}
                    nome={e.nome}
                    subtitulo={e.descricao ?? undefined}
                    total={e.total_riscos}
                    distribuicao={e.distribuicao}
                    href={`/gestao-riscos/riscos?elo_cadeia_valor_id=${e.id}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
