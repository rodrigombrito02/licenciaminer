"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertOctagon,
  CalendarCheck,
  FileStack,
  Flame,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CATEGORIA_COR,
  fetchCrisesDashboard,
  type CrisesDashboard,
} from "@/lib/crises-api";

export default function GestaoCrisesPage() {
  const [dash, setDash] = useState<CrisesDashboard | null>(null);

  useEffect(() => {
    fetchCrisesDashboard().then(setDash);
  }, []);

  if (!dash) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Gestão de Crises e Continuidade</h1>
        <p className="text-sm text-muted-foreground">
          ISO 22361 (crises) e ISO 22301 (continuidade) — cenários mapeados, comitês,
          simulados periódicos e planos de recuperação sobre processos críticos.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={<AlertOctagon className="h-4 w-4" />}
          label="Cenários mapeados"
          value={dash.total_cenarios}
          sub={`${dash.cenarios_aprovados} aprovados · ${dash.cenarios_em_revisao} em revisão`}
          href="/gestao-crises/cenarios"
          accent="#dc2626"
        />
        <Kpi
          icon={<CalendarCheck className="h-4 w-4" />}
          label="Simulados"
          value={dash.total_simulados}
          sub={`${dash.simulados_realizados} realizados · ${dash.simulados_planejados} planejados${
            dash.nota_media_simulados ? ` · nota ${dash.nota_media_simulados}/5` : ""
          }`}
          href="/gestao-crises/simulados"
          accent="#0ea5e9"
        />
        <Kpi
          icon={<FileStack className="h-4 w-4" />}
          label="Processos críticos"
          value={dash.total_processos_criticos}
          sub={`${dash.processos_alta_prioridade} com prioridade alta/crítica`}
          href="/gestao-crises/bcp"
          accent="#8b5cf6"
        />
        <Kpi
          icon={<Trophy className="h-4 w-4" />}
          label="Exposição / hora"
          value={formatBRL(dash.exposicao_financeira_hora)}
          sub="Soma do impacto/h dos processos de alta prioridade"
          accent="#f59e0b"
          isString
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(dash.por_categoria)
              .sort(([, a], [, b]) => b - a)
              .map(([k, v]) => {
                const max = Math.max(...Object.values(dash.por_categoria));
                const pct = (v / max) * 100;
                return (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: CATEGORIA_COR[k] ?? "#64748b" }}
                    />
                    <span className="flex-1 capitalize">{k}</span>
                    <span className="font-mono text-muted-foreground">{v}</span>
                    <div className="h-2 w-20 rounded bg-muted">
                      <div
                        className="h-2 rounded"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CATEGORIA_COR[k] ?? "#64748b",
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
            <CardTitle className="text-base">Por severidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(dash.por_severidade)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="flex-1">{k}</span>
                  <span className="font-mono text-muted-foreground">{v}</span>
                  <div className="h-2 w-20 rounded bg-muted">
                    <div
                      className="h-2 rounded bg-red-500"
                      style={{
                        width: `${(v / Math.max(...Object.values(dash.por_severidade))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status dos cenários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(dash.por_status).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="flex-1 capitalize">{k.replace("_", " ")}</span>
                <span className="font-mono text-muted-foreground">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-red-500" />
              Top cenários críticos (severidade × probabilidade)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dash.cenarios_criticos_top.map((c) => (
              <Link
                key={c.id}
                href={`/gestao-crises/cenarios/${c.id}`}
                className="flex items-start gap-3 rounded border border-border p-2 hover:border-red-500/50"
              >
                <div
                  className="mt-1 flex h-8 w-12 flex-col items-center justify-center rounded font-bold text-white"
                  style={{
                    backgroundColor: `${CATEGORIA_COR[c.categoria ?? ""] ?? "#64748b"}`,
                  }}
                >
                  <span className="text-sm">{c.score}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.codigo}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize">
                      {c.categoria}
                    </span>
                  </div>
                  <div className="text-sm">{c.nome}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Severidade {c.severidade} · Probabilidade {c.probabilidade}
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-blue-500" />
              Próximos simulados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dash.proximos_simulados.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum simulado futuro planejado.
              </p>
            ) : (
              dash.proximos_simulados.map((s) => (
                <Link
                  key={s.id}
                  href={`/gestao-crises/cenarios/${s.cenario_id}`}
                  className="flex items-center gap-3 rounded border border-border p-2 hover:border-blue-500/50"
                >
                  <div className="flex h-12 w-14 flex-col items-center justify-center rounded bg-blue-500/10 text-center">
                    <span className="text-[9px] uppercase text-blue-700">
                      {s.data_prevista?.slice(5, 7)}/{s.data_prevista?.slice(2, 4)}
                    </span>
                    <span className="text-sm font-bold text-blue-700">
                      {s.data_prevista?.slice(8, 10)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{s.titulo}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Tipo: <span className="uppercase">{s.tipo}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Acesso rápido
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Shortcut href="/gestao-crises/cenarios" label="Cenários" icon={<AlertOctagon />} />
          <Shortcut href="/gestao-crises/comites" label="Comitês" icon={<Users />} />
          <Shortcut href="/gestao-crises/simulados" label="Simulados" icon={<Target />} />
          <Shortcut href="/gestao-crises/bcp" label="BCP / BIA" icon={<FileStack />} />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  href,
  accent,
  isString,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
  href?: string;
  accent?: string;
  isString?: boolean;
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
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className={`font-bold ${isString ? "text-lg" : "text-2xl"}`}>{value}</div>
          <div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
            {sub}
          </div>
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
