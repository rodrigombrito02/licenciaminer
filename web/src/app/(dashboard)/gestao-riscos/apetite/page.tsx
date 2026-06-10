"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassificacaoBadge } from "@/components/riscos/classificacao-badge";
import {
  fetchAppetiteDashboard,
  type AppetiteBreach,
  type AppetiteDashboard,
} from "@/lib/monitoramento-api";

const APETITE_LABEL = ["", "Muito avesso", "Avesso", "Moderado", "Agressivo", "Muito agressivo"];

export default function ApetitePage() {
  const [dash, setDash] = useState<AppetiteDashboard | null>(null);

  useEffect(() => {
    fetchAppetiteDashboard().then(setDash);
  }, []);

  if (!dash) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Risk Appetite & Tolerance
        </h1>
        <p className="text-sm text-muted-foreground">
          ISO 31000 §5.4.3 — declaração formal do apetite por categoria, tolerância máxima
          e gatilhos de escalation. Compara com a exposição real dos riscos.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={<Shield />}
          label="Apetites declarados"
          value={dash.total_apetites}
        />
        <Kpi
          icon={<CheckCircle2 />}
          label="Categorias cobertas"
          value={dash.categorias_cobertas}
          accent="#16a34a"
        />
        <Kpi
          icon={<AlertTriangle />}
          label="Riscos em breach"
          value={dash.riscos_em_breach_total}
          accent="#dc2626"
        />
        <Kpi
          icon={<CheckCircle2 />}
          label="Categorias com 0 breach"
          value={dash.apetites.filter((a) => a.em_breach === 0).length}
          accent="#16a34a"
        />
      </div>

      <div className="space-y-3">
        {dash.apetites.map((a) => (
          <AppetiteCard key={a.categoria_id} apt={a} />
        ))}
      </div>
    </div>
  );
}

function AppetiteCard({ apt }: { apt: AppetiteBreach }) {
  const pct = apt.total_riscos === 0 ? 0 : (apt.em_breach / apt.total_riscos) * 100;
  const corCategoria = apt.categoria_cor ?? "#64748b";
  const emBreach = apt.em_breach > 0;
  return (
    <Card className={emBreach ? "border-red-500/50" : "border-border"}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: corCategoria }}
              />
              {apt.categoria_nome}
            </CardTitle>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                Apetite: <strong>{APETITE_LABEL[apt.apetite_nivel]} ({apt.apetite_nivel}/5)</strong>
              </span>
              <span>
                Tolerância máxima:{" "}
                <span className="inline-block">
                  <ClassificacaoBadge value={apt.tolerancia} />
                </span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase text-muted-foreground">Exposição</div>
            <div className="flex items-baseline gap-1">
              <span
                className="text-2xl font-bold"
                style={{ color: emBreach ? "#dc2626" : "#16a34a" }}
              >
                {apt.em_breach}
              </span>
              <span className="text-xs text-muted-foreground">/ {apt.total_riscos} em breach</span>
            </div>
            <div className="mt-1 h-1.5 w-32 rounded bg-muted">
              <div
                className="h-1.5 rounded"
                style={{
                  width: `${pct}%`,
                  backgroundColor: emBreach ? "#dc2626" : "#16a34a",
                }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {apt.descricao && (
          <p className="text-sm">
            <strong className="text-muted-foreground">Declaração:</strong> {apt.descricao}
          </p>
        )}
        {apt.trigger_escalation && (
          <p className="text-xs text-muted-foreground">
            <strong>Gatilho de escalation:</strong> {apt.trigger_escalation}
          </p>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-2 text-[10px]">
          <span className="text-muted-foreground">Distribuição real:</span>
          {Object.entries(apt.por_classificacao).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono"
            >
              {k}: {v}
            </span>
          ))}
        </div>

        {apt.riscos_em_breach.length > 0 && (
          <div className="rounded border border-red-500/30 bg-red-500/5 p-2">
            <div className="mb-1 text-[10px] font-semibold uppercase text-red-700">
              ⚠ Riscos que violam a tolerância
            </div>
            <div className="flex flex-wrap gap-1">
              {apt.riscos_em_breach.map((r) => (
                <Link
                  key={r.id}
                  href={`/gestao-riscos/riscos/${r.id}`}
                  className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-[11px] hover:bg-red-500/20"
                  title={r.nome}
                >
                  <span className="font-mono">{r.codigo}</span>
                  <span>· {r.classificacao_residual}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Kpi({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded text-white"
          style={{ backgroundColor: accent ?? "#0f766e" }}
        >
          {icon}
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold" style={{ color: accent }}>
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
