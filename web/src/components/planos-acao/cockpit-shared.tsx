"use client";

import Link from "next/link";
import { AlertTriangle, Calendar, CheckCircle2, Clock, GitBranch, Users, AlertOctagon, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Donut } from "./donut";

const STATUS_COLORS: Record<string, string> = {
  concluido: "#27AE60", "concluído": "#27AE60", finalizado: "#27AE60", feito: "#27AE60",
  "em andamento": "#3498DB", "em execucao": "#3498DB", "em execução": "#3498DB",
  atrasado: "#E74C3C",
  "nao iniciado": "#9CA3AF", "não iniciado": "#9CA3AF", pendente: "#9CA3AF",
  bloqueado: "#FF5F00", cancelado: "#6B7280",
};
function statusColor(s: string) {
  return STATUS_COLORS[s.toLowerCase().trim()] ?? "#156082";
}

const AREA_PALETTE = ["#156082", "#FFC000", "#FF5F00", "#27AE60", "#9333EA", "#0EA5E9", "#EC4899", "#84CC16"];

export interface ConsolidadoAgg {
  total: number;
  concluidas: number;
  em_andamento: number;
  atrasadas: number;
  nao_iniciadas: number;
  sem_responsavel: number;
  sem_area: number;
  pct_medio: number;
  pct_concluidas: number;
  por_status: Record<string, number>;
  por_area: Record<string, number>;
  por_responsavel: Record<string, number>;
  por_classificacao: Record<string, number>;
  prazos: {
    atrasadas_top: Array<{
      plano_id: number; descricao: string | null;
      responsavel: string | null; area: string | null;
      data_fim: string; dias_atraso: number; status: string | null;
    }>;
    proximas_30d: Array<{
      plano_id: number; descricao: string | null;
      responsavel: string | null; area: string | null;
      data_fim: string; dias_restantes: number; status: string | null;
    }>;
    data_min: string | null;
    data_max: string | null;
  };
  conflitos_responsavel: Array<{
    responsavel: string; tarefa_a: string | null; plano_a: number;
    tarefa_b: string | null; plano_b: number;
    sobreposicao_inicio: string; sobreposicao_fim: string;
  }>;
}

export function CockpitKPIs({ agg }: { agg: ConsolidadoAgg }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <KpiBox label="Tarefas totais" value={agg.total} color="#0A2540" icon={FileSpreadsheet} />
      <KpiBox label="Concluídas" value={agg.concluidas} subtitle={`${agg.pct_concluidas}%`} color="#27AE60" icon={CheckCircle2} />
      <KpiBox label="Em andamento" value={agg.em_andamento} color="#3498DB" icon={Clock} />
      <KpiBox label="Atrasadas" value={agg.atrasadas} color="#E74C3C" icon={AlertTriangle} />
      <KpiBox label="% médio" value={`${agg.pct_medio}%`} color="#156082" icon={GitBranch} />
    </div>
  );
}

function KpiBox({ label, value, subtitle, color, icon: Icon }: {
  label: string; value: string | number; subtitle?: string; color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold font-tabular" style={{ color }}>{value}</div>
            <div className="text-[11px] text-muted-foreground">{label}</div>
            {subtitle && <div className="text-[10px] text-muted-foreground/70">{subtitle}</div>}
          </div>
          <Icon className="h-4 w-4 opacity-50" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}

export function DonutsRow({ agg }: { agg: ConsolidadoAgg }) {
  const statusSlices = Object.entries(agg.por_status).map(([k, v]) => ({
    label: k, value: v, color: statusColor(k),
  }));
  const areaSlices = Object.entries(agg.por_area).slice(0, 8).map(([k, v], i) => ({
    label: k, value: v, color: AREA_PALETTE[i % AREA_PALETTE.length],
  }));
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm">Por Status</CardTitle></CardHeader>
        <CardContent>
          <Donut slices={statusSlices} centerValue={agg.total} centerLabel="tarefas" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm">Por Área</CardTitle></CardHeader>
        <CardContent>
          <Donut slices={areaSlices} centerValue={Object.keys(agg.por_area).length} centerLabel="áreas" />
        </CardContent>
      </Card>
    </div>
  );
}

export function AlertasCard({ agg }: { agg: ConsolidadoAgg }) {
  const atrasadas = agg.prazos.atrasadas_top;
  const proximas = agg.prazos.proximas_30d;
  const conflitos = agg.conflitos_responsavel;
  return (
    <div className="grid md:grid-cols-3 gap-3">
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Atrasadas ({atrasadas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-64 overflow-y-auto">
          {atrasadas.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhuma tarefa atrasada</p>
          ) : atrasadas.slice(0, 8).map((a, i) => (
            <Link key={i} href={`/planos-de-acao/${a.plano_id}`} className="block p-2 hover:bg-muted/40 rounded border-l-2 border-destructive">
              <div className="text-xs font-medium truncate">{a.descricao}</div>
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>{a.responsavel || "—"} · {a.area || "—"}</span>
                <Badge variant="destructive" className="text-[9px]">{a.dias_atraso}d</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
      <Card className="border-warning/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-warning">
            <Calendar className="h-4 w-4" /> Próximos 30 dias ({proximas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-64 overflow-y-auto">
          {proximas.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhum vencimento próximo</p>
          ) : proximas.slice(0, 8).map((a, i) => (
            <Link key={i} href={`/planos-de-acao/${a.plano_id}`} className="block p-2 hover:bg-muted/40 rounded border-l-2 border-warning">
              <div className="text-xs font-medium truncate">{a.descricao}</div>
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>{a.responsavel || "—"} · {a.area || "—"}</span>
                <Badge variant="outline" className="text-[9px]">{a.dias_restantes}d</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
      <Card className="border-brand-orange/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-brand-orange">
            <AlertOctagon className="h-4 w-4" /> Conflitos de responsável ({conflitos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-64 overflow-y-auto">
          {conflitos.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhum conflito cruzado entre planos</p>
          ) : conflitos.slice(0, 8).map((c, i) => (
            <div key={i} className="p-2 rounded bg-muted/30 border-l-2 border-brand-orange">
              <div className="text-xs font-medium flex items-center gap-1">
                <Users className="h-3 w-3" /> {c.responsavel}
              </div>
              <div className="text-[10px] text-muted-foreground">
                <Link href={`/planos-de-acao/${c.plano_a}`} className="hover:underline">P{c.plano_a}: {c.tarefa_a}</Link>
                {" × "}
                <Link href={`/planos-de-acao/${c.plano_b}`} className="hover:underline">P{c.plano_b}: {c.tarefa_b}</Link>
              </div>
              <div className="text-[10px] text-muted-foreground/70">
                {c.sobreposicao_inicio} → {c.sobreposicao_fim}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function RespRanking({ agg }: { agg: ConsolidadoAgg }) {
  const entries = Object.entries(agg.por_responsavel).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(e => e[1]));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-teal" /> Top responsáveis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {entries.map(([nome, n]) => (
          <div key={nome} className="flex items-center gap-2 text-xs">
            <span className="w-40 truncate">{nome}</span>
            <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
              <div className="h-full bg-brand-teal/70" style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right tabular-nums font-medium">{n}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
