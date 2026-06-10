"use client";

import { useMemo } from "react";
import type { PaTarefa } from "@/lib/api";

interface GanttProps {
  tarefas: PaTarefa[];
  /** altura de cada linha em px */
  rowHeight?: number;
  /** opcao de cor por status */
  colorByStatus?: boolean;
  maxRows?: number;
}

const STATUS_COLOR: Record<string, string> = {
  concluido: "#27AE60",
  concluído: "#27AE60",
  "em andamento": "#3498DB",
  "em execucao": "#3498DB",
  "em execução": "#3498DB",
  atrasado: "#E74C3C",
  "nao iniciado": "#9CA3AF",
  "não iniciado": "#9CA3AF",
  pendente: "#9CA3AF",
  bloqueado: "#FF5F00",
  cancelado: "#6B7280",
};

function statusColor(status: string | null): string {
  if (!status) return "#9CA3AF";
  const key = status.toLowerCase().trim();
  return STATUS_COLOR[key] ?? "#156082"; // teal default
}

function ddmm(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function Gantt({ tarefas, rowHeight = 22, colorByStatus = true, maxRows = 100 }: GanttProps) {
  const data = useMemo(() => {
    const withDates = tarefas
      .filter(t => t.data_inicio && t.data_fim)
      .slice(0, maxRows);

    if (withDates.length === 0) return null;

    const allDates = withDates.flatMap(t => [new Date(t.data_inicio!).getTime(), new Date(t.data_fim!).getTime()]);
    const min = Math.min(...allDates);
    const max = Math.max(...allDates);
    const span = Math.max(max - min, 86400000); // pelo menos 1 dia

    // Eixo: marcas mensais
    const ticks: { x: number; label: string }[] = [];
    const start = new Date(min);
    start.setDate(1);
    const end = new Date(max);
    let cur = new Date(start);
    while (cur.getTime() <= end.getTime()) {
      const x = ((cur.getTime() - min) / span) * 100;
      ticks.push({
        x,
        label: cur.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    return { withDates, min, max, span, ticks };
  }, [tarefas, maxRows]);

  if (!data) {
    return (
      <div className="text-xs text-muted-foreground italic p-4">
        Nenhuma tarefa com data início + fim para gerar Gantt.
      </div>
    );
  }

  const { withDates, min, span, ticks } = data;

  return (
    <div className="overflow-auto">
      <div className="min-w-[700px]">
        {/* Header com escala temporal */}
        <div className="grid grid-cols-[260px_1fr] border-b text-[10px] text-muted-foreground sticky top-0 bg-white z-10">
          <div className="px-2 py-1 border-r font-semibold">Tarefa</div>
          <div className="relative h-5">
            {ticks.map((t, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-muted px-1"
                style={{ left: `${t.x}%` }}
              >
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* Linhas */}
        {withDates.map((t) => {
          const startMs = new Date(t.data_inicio!).getTime();
          const endMs = new Date(t.data_fim!).getTime();
          const left = ((startMs - min) / span) * 100;
          const width = Math.max(((endMs - startMs) / span) * 100, 0.5);
          const color = colorByStatus ? statusColor(t.status) : "#156082";
          const pct = t.pct_concluido ?? 0;
          return (
            <div
              key={t.id}
              className="grid grid-cols-[260px_1fr] border-b hover:bg-muted/30"
              style={{ height: rowHeight }}
            >
              <div className="px-2 flex items-center text-[11px] border-r truncate" title={t.descricao || ""}>
                <span className="font-mono text-[10px] text-muted-foreground mr-1">
                  {t.eap_codigo || "·"}
                </span>
                <span className="truncate" style={{ paddingLeft: `${((t.eap_nivel || 1) - 1) * 8}px` }}>
                  {t.descricao}
                </span>
              </div>
              <div className="relative" style={{ height: rowHeight }}>
                {/* barra */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded text-[9px] text-white px-1.5 overflow-hidden whitespace-nowrap flex items-center"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    height: rowHeight - 8,
                    background: color,
                    opacity: 0.9,
                  }}
                  title={`${t.descricao}\n${ddmm(new Date(startMs))} → ${ddmm(new Date(endMs))}\n${t.responsavel_pessoa || "-"} · ${t.status || "-"} · ${pct}%`}
                >
                  {pct > 0 && (
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-white/30 rounded"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <span className="relative z-10">{pct > 0 && pct < 100 ? `${pct}%` : ""}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
