"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ControlesDashboard } from "@/lib/riscos-api";

const STATUS_TESTE_COLOR: Record<string, string> = {
  aprovado: "#16a34a",
  parcial: "#eab308",
  reprovado: "#dc2626",
};

export function ControlesDashboardCards({ data }: { data: ControlesDashboard }) {
  const totalEf = Object.values(data.por_efetividade).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total" value={data.total} />
        <Kpi label="Sem responsável" value={data.sem_responsavel} accent="#64748b" />
        <Kpi label="Sem teste registrado" value={data.sem_teste} accent="#f59e0b" />
        <Kpi label="Último teste > 6m" value={data.testado_ha_mais_6m} accent="#dc2626" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Preventivos × Corretivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.por_tipo).map(([k, v]) => {
              const pct = data.total > 0 ? Math.round((v / data.total) * 100) : 0;
              return (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="capitalize">{k}</span>
                    <span className="text-muted-foreground">
                      {v} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded bg-muted">
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: k === "preventivo" ? "#3b82f6" : "#dc2626",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Efetividade (1–5)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {totalEf === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum controle com efetividade preenchida.
              </p>
            ) : (
              [1, 2, 3, 4, 5].map((n) => {
                const v = data.por_efetividade[String(n)] ?? 0;
                const pct = totalEf > 0 ? Math.round((v / totalEf) * 100) : 0;
                return (
                  <div key={n}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>Efetividade {n}</span>
                      <span className="text-muted-foreground">
                        {v} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status dos testes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.por_status_teste).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum teste registrado ainda.
              </p>
            ) : (
              Object.entries(data.por_status_teste).map(([k, v]) => {
                const total = Object.values(data.por_status_teste).reduce(
                  (a, b) => a + b,
                  0,
                );
                const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                return (
                  <div key={k}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="capitalize">{k}</span>
                      <span className="text-muted-foreground">
                        {v} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded bg-muted">
                      <div
                        className="h-2 rounded"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: STATUS_TESTE_COLOR[k] ?? "#64748b",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top riscos por nº de controles</CardTitle>
          </CardHeader>
          <CardContent>
            {data.por_risco_top.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados</p>
            ) : (
              <div className="space-y-1.5">
                {data.por_risco_top.map(([cod, v]) => (
                  <div key={cod} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate font-mono">{cod}</span>
                    <span className="font-mono text-muted-foreground">{v}</span>
                    <div className="h-2 w-24 rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{
                          width: `${(v / (data.por_risco_top[0]?.[1] || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Periodicidade de teste</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(data.por_periodicidade).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma periodicidade definida. Preencha em cada controle.
              </p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(data.por_periodicidade)
                  .sort(([, a], [, b]) => b - a)
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 truncate">{k}</span>
                      <span className="font-mono text-muted-foreground">{v}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold" style={{ color: accent }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
