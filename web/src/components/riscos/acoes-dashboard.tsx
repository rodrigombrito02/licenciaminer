"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STATUS_ACAO,
  STATUS_ACAO_COLOR,
  type AcoesDashboard,
} from "@/lib/riscos-api";

export function AcoesDashboardCards({
  data,
}: {
  data: AcoesDashboard;
}) {
  const totalTipo = Object.values(data.por_tipo).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total de ações" value={data.total} />
        <Kpi label="Atrasadas" value={data.atrasadas} accent="#dc2626" />
        <Kpi label="Vencendo em ≤30 dias" value={data.vencendo_30d} accent="#f59e0b" />
        <Kpi label="% médio concluído" value={`${data.concluidas_pct_medio}%`} accent="#16a34a" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Kpi label="Sem responsável" value={data.sem_responsavel} accent="#64748b" />
        <Kpi label="Sem prazo" value={data.sem_prazo} accent="#64748b" />
        <Kpi
          label="Concluídas"
          value={data.por_status.concluida ?? 0}
          accent="#16a34a"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição por status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {STATUS_ACAO.map((s) => {
              const v = data.por_status[s.value] ?? 0;
              const pct = data.total > 0 ? Math.round((v / data.total) * 100) : 0;
              return (
                <div key={s.value}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{s.label}</span>
                    <span className="text-muted-foreground">
                      {v} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded bg-muted">
                    <div
                      className="h-2 rounded"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: STATUS_ACAO_COLOR[s.value],
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
            <CardTitle className="text-base">Preventivas × Corretivas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.por_tipo).map(([k, v]) => {
              const pct = Math.round((v / totalTipo) * 100);
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
                        backgroundColor: k === "preventiva" ? "#3b82f6" : "#dc2626",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BarList
          title="Top responsáveis"
          entries={data.por_responsavel_top}
          color="#0ea5e9"
        />
        <BarList
          title="Top donos do risco"
          entries={data.por_dono_risco_top}
          color="#8b5cf6"
        />
        <BarList title="Top áreas" entries={data.por_area_top} color="#16a34a" />
        <BarList
          title="Top categorias"
          entries={data.por_categoria_top}
          color="#eab308"
        />
        <BarList
          title="Top grupos de trabalho"
          entries={data.por_grupo_trabalho_top}
          color="#f97316"
        />
        <BarList
          title="Top riscos por nº de ações"
          entries={data.por_risco_top}
          color="#dc2626"
          mono
        />
      </div>

      {Object.keys(data.status_por_responsavel).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status por responsável</CardTitle>
            <p className="text-xs text-muted-foreground">
              Top 10 responsáveis mostrando a distribuição de status das suas ações.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.status_por_responsavel).map(([nome, stats]) => {
                const total = Object.values(stats).reduce((a, b) => a + b, 0);
                return (
                  <div key={nome}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium">{nome}</span>
                      <span className="text-muted-foreground">{total}</span>
                    </div>
                    <div className="flex h-5 w-full overflow-hidden rounded">
                      {STATUS_ACAO.map((s) => {
                        const v = stats[s.value] ?? 0;
                        if (v === 0) return null;
                        const pct = (v / total) * 100;
                        return (
                          <div
                            key={s.value}
                            className="flex items-center justify-center text-[9px] text-white"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: STATUS_ACAO_COLOR[s.value],
                            }}
                            title={`${s.label}: ${v}`}
                          >
                            {pct > 8 && v}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BarList({
  title,
  entries,
  color,
  mono,
}: {
  title: string;
  entries: [string, number][];
  color: string;
  mono?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Sem dados</p>
        </CardContent>
      </Card>
    );
  }
  const max = entries[0]?.[1] || 1;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {entries.map(([nome, v]) => (
            <div key={nome} className="flex items-center gap-2 text-xs">
              <span className={`flex-1 truncate ${mono ? "font-mono" : ""}`}>{nome}</span>
              <span className="font-mono text-muted-foreground">{v}</span>
              <div className="h-2 w-24 rounded bg-muted">
                <div
                  className="h-2 rounded"
                  style={{ width: `${(v / max) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
