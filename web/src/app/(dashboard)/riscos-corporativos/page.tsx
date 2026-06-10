"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  FileStack,
  Flame,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClassificacaoBadge } from "@/components/riscos/classificacao-badge";
import {
  CATEGORIA_ERM_COR,
  PERSPECTIVA_BSC_COR,
  PERSPECTIVA_BSC_LABEL,
  fetchAlertaSnapshot,
  fetchDashboardCorporativo,
  type AlertaSnapshot,
  type DashboardCorporativo,
} from "@/lib/corporativo-api";

export default function RiscosCorporativosLanding() {
  const [dash, setDash] = useState<DashboardCorporativo | null>(null);
  const [alerta, setAlerta] = useState<AlertaSnapshot | null>(null);

  useEffect(() => {
    fetchDashboardCorporativo().then(setDash);
    fetchAlertaSnapshot().then(setAlerta);
  }, []);

  if (!dash) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Riscos Corporativos (ERM)</h1>
          <p className="text-sm text-muted-foreground">
            Enterprise Risk Management — COSO ERM 2017 + ISO 31000:2018. Riscos que
            ameaçam a execução da estratégia corporativa, independente de projetos.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            window.open(
              `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/corporativo/board-report-pdf`,
              "_blank",
            );
          }}
        >
          ⬇ Reporte Trimestral ao Board (PDF)
        </Button>
      </header>

      {alerta && alerta.alerta && (
        <Card className="border-red-500/60 bg-red-500/5">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="text-2xl">⏰</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-700">
                {alerta.motivo === "nenhum_snapshot"
                  ? "Nenhum snapshot trimestral foi criado"
                  : `Snapshot trimestral vencido (${alerta.dias_desde_ultimo} dias desde o último)`}
              </div>
              <p className="text-xs text-muted-foreground">
                Periodicidade recomendada: {alerta.periodicidade_dias} dias (trimestral). Data
                sugerida: {alerta.data_sugerida_proximo}
                {alerta.ultimo_snapshot_titulo
                  ? ` · Último: ${alerta.ultimo_snapshot_titulo}`
                  : ""}
              </p>
            </div>
            <Button asChild>
              <Link href="/riscos-corporativos/snapshots">Criar snapshot</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi icon={<Shield />} label="Riscos corporativos" value={dash.total_corporativos} accent="#0ea5e9" href="/gestao-riscos/riscos?tipo_escopo=corporativo" />
        <Kpi icon={<AlertTriangle />} label="Ameaças" value={dash.total_ameacas} accent="#dc2626" />
        <Kpi icon={<TrendingUp />} label="Oportunidades" value={dash.total_oportunidades} accent="#16a34a" />
        <Kpi icon={<Flame />} label="Críticos" value={dash.criticos} accent="#dc2626" />
        <Kpi icon={<Flame />} label="Muito Signif." value={dash.muito_significativos} accent="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por categoria COSO ERM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(dash.por_categoria_erm)
              .sort(([, a], [, b]) => b.n - a.n)
              .map(([cod, info]) => {
                const maxN = Math.max(
                  ...Object.values(dash.por_categoria_erm).map((x) => x.n),
                );
                const cor = info.cor ?? CATEGORIA_ERM_COR[cod] ?? "#64748b";
                return (
                  <div key={cod}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-flex h-5 w-8 items-center justify-center rounded font-bold text-white"
                          style={{ backgroundColor: cor }}
                        >
                          {cod}
                        </span>
                        {info.nome}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {info.n} {info.criticos > 0 && <span className="text-red-600">(⚠ {info.criticos} críticos)</span>}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded bg-muted">
                      <div
                        className="h-2 rounded"
                        style={{ width: `${(info.n / maxN) * 100}%`, backgroundColor: cor }}
                      />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por 3 linhas de defesa (IIA/ISO 31000)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(dash.por_linha_defesa)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="flex-1">{k}</span>
                  <span className="font-mono text-muted-foreground">{v}</span>
                  <div className="h-2 w-24 rounded bg-muted">
                    <div
                      className="h-2 rounded bg-blue-500"
                      style={{
                        width: `${(v / Math.max(...Object.values(dash.por_linha_defesa))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por horizonte temporal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(dash.por_horizonte).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="flex-1 capitalize">{k} ({k === "curto" ? "0-1a" : k === "medio" ? "1-3a" : "3-10a"})</span>
                <span className="font-mono text-muted-foreground">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tratamento estratégico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(dash.por_tratamento_estrategico).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="flex-1 capitalize">{k}</span>
                <span className="font-mono text-muted-foreground">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-red-500" />
            Top 10 riscos corporativos (score residual)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dash.top_10.map((r) => (
            <Link
              key={r.id}
              href={`/gestao-riscos/riscos/${r.id}`}
              className="flex items-center gap-3 rounded border border-border p-2 hover:border-red-500/50"
            >
              <div
                className="flex h-10 w-12 flex-col items-center justify-center rounded font-bold text-white"
                style={{
                  backgroundColor:
                    r.score >= 15 ? "#dc2626" : r.score >= 9 ? "#f59e0b" : "#0ea5e9",
                }}
              >
                <span className="text-sm">{r.score}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.codigo}</span>
                  <ClassificacaoBadge value={r.classificacao_residual} />
                </div>
                <div className="line-clamp-1 text-sm">{r.nome}</div>
              </div>
              <div className="text-right text-[10px] text-muted-foreground">
                P{r.prob_residual ?? "—"} × I{r.impacto_residual ?? "—"}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-blue-500" />
            Cobertura por objetivo estratégico (BSC)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Quantos riscos ameaçam cada objetivo. COSO ERM: risco é sempre em relação ao objetivo.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {dash.cobertura_objetivos.map((o) => {
            const cor = PERSPECTIVA_BSC_COR[o.perspectiva_bsc] ?? "#64748b";
            return (
              <Link
                key={o.id}
                href={`/riscos-corporativos/objetivos/${o.id}`}
                className="flex items-center gap-3 rounded border border-border p-2 hover:border-primary/50"
              >
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                  style={{ backgroundColor: cor }}
                >
                  {PERSPECTIVA_BSC_LABEL[o.perspectiva_bsc] ?? o.perspectiva_bsc}
                </span>
                <div className="flex-1">
                  <div className="text-sm">{o.descricao}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{o.codigo}</div>
                </div>
                <div
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    o.n_riscos === 0
                      ? "bg-muted text-muted-foreground"
                      : o.n_riscos >= 3
                      ? "bg-red-500/20 text-red-700"
                      : "bg-yellow-500/20 text-yellow-700"
                  }`}
                >
                  {o.n_riscos} risco{o.n_riscos === 1 ? "" : "s"}
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Acesso rápido</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Shortcut href="/riscos-corporativos/objetivos" icon={<Target />} label="Objetivos" />
          <Shortcut href="/riscos-corporativos/taxonomia-erm" icon={<FileStack />} label="Taxonomia COSO" />
          <Shortcut href="/riscos-corporativos/linhas-defesa" icon={<Shield />} label="3 Linhas de Defesa" />
          <Shortcut href="/riscos-corporativos/snapshots" icon={<Calendar />} label="Snapshots" />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  accent,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
  href?: string;
}) {
  const card = (
    <Card className="h-full">
      <CardContent className="flex items-start gap-3 py-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded text-white"
          style={{ backgroundColor: accent ?? "#0f766e" }}
        >
          {icon}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function Shortcut({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center rounded border border-border bg-card p-3 text-center transition hover:border-primary/50"
    >
      <div className="mb-1 text-primary">{icon}</div>
      <div className="text-sm font-medium">{label}</div>
    </Link>
  );
}
