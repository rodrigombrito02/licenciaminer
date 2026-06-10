"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FileStack,
  MessageSquare,
  Send,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TIPO_COR,
  fetchComunicacoesDashboard,
  type ComunicacoesDashboard,
} from "@/lib/comunicacoes-api";

export default function ComunicacoesLanding() {
  const [dash, setDash] = useState<ComunicacoesDashboard | null>(null);

  useEffect(() => {
    fetchComunicacoesDashboard().then(setDash);
  }, []);

  if (!dash) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Fluxo de Comunicações</h1>
        <p className="text-sm text-muted-foreground">
          ISO 31000 §6.2 — matriz RACI de comunicação por risco/cenário, templates
          pré-aprovados e log de envios. Base para planos de ação, controle e gestão de crise.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Stakeholders mapeados"
          value={dash.total_stakeholders}
          href="/comunicacoes/stakeholders"
          accent="#0ea5e9"
        />
        <Kpi
          icon={<FileStack className="h-4 w-4" />}
          label="Templates"
          value={dash.total_templates}
          href="/comunicacoes/templates"
          accent="#8b5cf6"
        />
        <Kpi
          icon={<MessageSquare className="h-4 w-4" />}
          label="Entidades com RACI"
          value={dash.entidades_com_raci}
          accent="#f59e0b"
        />
        <Kpi
          icon={<Send className="h-4 w-4" />}
          label="Envios registrados"
          value={dash.total_envios}
          href="/comunicacoes/envios"
          accent="#16a34a"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stakeholders por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(dash.por_tipo_stakeholder)
              .sort(([, a], [, b]) => b - a)
              .map(([k, v]) => {
                const max = Math.max(...Object.values(dash.por_tipo_stakeholder));
                const cor = TIPO_COR[k] ?? "#64748b";
                return (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: cor }} />
                    <span className="flex-1 capitalize">{k}</span>
                    <span className="font-mono text-muted-foreground">{v}</span>
                    <div className="h-2 w-20 rounded bg-muted">
                      <div
                        className="h-2 rounded"
                        style={{ width: `${(v / max) * 100}%`, backgroundColor: cor }}
                      />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Templates por categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(dash.por_categoria_template).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="flex-1 capitalize">{k.replace("_", " ")}</span>
                <span className="font-mono text-muted-foreground">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Envios por canal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(dash.por_canal_envio).length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem envios ainda.</p>
            ) : (
              Object.entries(dash.por_canal_envio).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="flex-1">{k}</span>
                  <span className="font-mono text-muted-foreground">{v}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Últimos envios registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {dash.ultimos_envios.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem envios registrados.</p>
          ) : (
            <div className="space-y-1.5">
              {dash.ultimos_envios.map((e) => (
                <div key={e.id} className="flex items-start gap-3 rounded border border-border p-2 text-xs">
                  <div className="font-mono text-muted-foreground">{e.data_envio}</div>
                  <div className="flex-1">
                    <div className="font-medium">{e.assunto ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {e.canal} · para {e.stakeholder_nome ?? "—"}
                      {e.template_codigo ? ` · template ${e.template_codigo}` : ""}
                    </div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      e.resultado === "confirmado"
                        ? "bg-green-500/20 text-green-700"
                        : e.resultado === "enviado"
                        ? "bg-blue-500/20 text-blue-700"
                        : e.resultado === "falha"
                        ? "bg-red-500/20 text-red-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {e.resultado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Acesso rápido</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Shortcut href="/comunicacoes/stakeholders" label="Stakeholders" icon={<Users />} />
          <Shortcut href="/comunicacoes/templates" label="Templates" icon={<FileStack />} />
          <Shortcut href="/comunicacoes/envios" label="Envios" icon={<Send />} />
          <Shortcut href="/gestao-crises/cenarios" label="Cenários (RACI)" icon={<MessageSquare />} />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  href,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
  accent?: string;
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
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function Shortcut({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
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
