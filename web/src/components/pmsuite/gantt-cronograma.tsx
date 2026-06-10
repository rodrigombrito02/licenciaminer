"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EPCM_COR, EXECUTOR_COR, type CronogramaNode } from "@/lib/pmsuite-api";

const DAY_MS = 1000 * 60 * 60 * 24;
const LABEL_W = 380;

type Scale = "week" | "month" | "quarter" | "year";

const SCALES: Record<Scale, { pxPerDay: number; headerLabel: (d: Date) => string; majorEvery: "month" | "quarter" | "year" }> = {
  week: { pxPerDay: 5, majorEvery: "month", headerLabel: (d) => `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}` },
  month: { pxPerDay: 1.5, majorEvery: "month", headerLabel: (d) => d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) },
  quarter: { pxPerDay: 0.6, majorEvery: "quarter", headerLabel: (d) => `T${Math.floor(d.getMonth() / 3) + 1}/${String(d.getFullYear()).slice(2)}` },
  year: { pxPerDay: 0.22, majorEvery: "year", headerLabel: (d) => String(d.getFullYear()) },
};

export function GanttCronograma({ nodes }: { nodes: CronogramaNode[] }) {
  const [scale, setScale] = useState<Scale>("quarter");
  const [soh_criticos, setSohCriticos] = useState(false);
  const [filtro_executor, setFiltroExecutor] = useState<string>("all");

  // Filtrar nós que têm datas calculadas
  const withDates = nodes.filter((n) => n.inicio_cedo && n.termino_cedo);

  const filtrado = useMemo(() => {
    let r = withDates;
    if (soh_criticos) r = r.filter((n) => n.caminho_critico);
    if (filtro_executor !== "all") r = r.filter((n) => n.executor === filtro_executor);
    // Ordenar por código WBS
    return [...r].sort((a, b) => a.codigo_wbs.localeCompare(b.codigo_wbs, undefined, { numeric: true }));
  }, [withDates, soh_criticos, filtro_executor]);

  const { minDate, maxDate, totalDays, width } = useMemo(() => {
    if (filtrado.length === 0) {
      return { minDate: new Date(), maxDate: new Date(), totalDays: 1, width: 400 };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const n of filtrado) {
      const s = new Date(n.inicio_cedo!).getTime();
      const e = new Date(n.termino_cedo!).getTime();
      if (s < min) min = s;
      if (e > max) max = e;
    }
    min -= 30 * DAY_MS;
    max += 30 * DAY_MS;
    const days = Math.ceil((max - min) / DAY_MS);
    const cfg = SCALES[scale];
    return {
      minDate: new Date(min),
      maxDate: new Date(max),
      totalDays: days,
      width: Math.max(800, days * cfg.pxPerDay),
    };
  }, [filtrado, scale]);

  const cfg = SCALES[scale];

  const marcadores = useMemo(() => {
    const out: { x: number; label: string; major: boolean }[] = [];
    const d = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (d <= maxDate) {
      const x = ((d.getTime() - minDate.getTime()) / DAY_MS) * cfg.pxPerDay;
      const isJan = d.getMonth() === 0;
      const isQStart = [0, 3, 6, 9].includes(d.getMonth());
      const major =
        cfg.majorEvery === "year" ? isJan : cfg.majorEvery === "quarter" ? isQStart : true;
      out.push({ x, label: cfg.headerLabel(d), major });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }, [minDate, maxDate, cfg]);

  const hoje = new Date();
  const hojeX =
    hoje >= minDate && hoje <= maxDate
      ? ((hoje.getTime() - minDate.getTime()) / DAY_MS) * cfg.pxPerDay
      : null;

  const executores = Array.from(new Set(withDates.map((n) => n.executor).filter(Boolean))) as string[];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase text-muted-foreground">Escala</label>
          <Select value={scale} onValueChange={(v) => setScale(v as Scale)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase text-muted-foreground">Executor</label>
          <Select value={filtro_executor} onValueChange={setFiltroExecutor}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {executores.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={soh_criticos}
            onChange={(e) => setSohCriticos(e.target.checked)}
          />
          Só caminho crítico
        </label>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtrado.length} de {withDates.length} pacotes visíveis
        </div>
      </div>

      <div className="overflow-auto rounded-md border border-border bg-card max-h-[70vh]">
        <div style={{ width: LABEL_W + width + 8 }}>
          {/* Header */}
          <div className="sticky top-0 z-20 flex border-b-2 border-border bg-muted/40">
            <div
              className="shrink-0 border-r-2 border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              style={{ width: LABEL_W, height: 40 }}
            >
              Pacote / WBS
            </div>
            <div className="relative" style={{ width, height: 40 }}>
              {marcadores.map((m, i) => (
                <div
                  key={i}
                  className={`absolute top-0 h-full whitespace-nowrap px-1 text-[10px] ${
                    m.major ? "font-bold text-foreground" : "text-muted-foreground"
                  }`}
                  style={{
                    left: m.x,
                    borderLeft: m.major ? "2px solid #334155" : "1px solid #cbd5e1",
                    paddingTop: 10,
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {filtrado.map((n) => {
            const s = new Date(n.inicio_cedo!).getTime();
            const e = new Date(n.termino_cedo!).getTime();
            const startX = ((s - minDate.getTime()) / DAY_MS) * cfg.pxPerDay;
            const barW = Math.max(3, ((e - s) / DAY_MS) * cfg.pxPerDay);
            const corBar = n.is_marco
              ? "#f59e0b"
              : n.caminho_critico
              ? "#dc2626"
              : n.executor
              ? EXECUTOR_COR[n.executor] ?? "#64748b"
              : "#64748b";
            return (
              <div
                key={n.id}
                className="flex border-b border-border/40 hover:bg-muted/20"
                style={{ minHeight: 28 }}
              >
                <div
                  className="shrink-0 border-r border-border px-3 py-1"
                  style={{ width: LABEL_W }}
                >
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {n.codigo_wbs}
                    </span>
                    {n.disciplina_epcm && (
                      <span
                        className="rounded px-1 text-[8px] font-bold text-white"
                        style={{ backgroundColor: EPCM_COR[n.disciplina_epcm] ?? "#64748b" }}
                      >
                        {n.disciplina_epcm}
                      </span>
                    )}
                    {n.caminho_critico && !n.is_marco && (
                      <span className="rounded bg-red-500 px-1 text-[8px] font-bold text-white">
                        CRÍT
                      </span>
                    )}
                    {n.is_marco && (
                      <span className="rounded bg-amber-500 px-1 text-[8px] font-bold text-white">
                        ♦
                      </span>
                    )}
                  </div>
                  <div className="line-clamp-1 text-[11px]">{n.nome}</div>
                </div>
                <div className="relative shrink-0" style={{ width, height: 28 }}>
                  {marcadores.map((m, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full"
                      style={{
                        left: m.x,
                        width: 1,
                        backgroundColor: m.major ? "#cbd5e1" : "#e2e8f0",
                      }}
                    />
                  ))}
                  {hojeX !== null && (
                    <div
                      className="absolute top-0 h-full"
                      style={{ left: hojeX, width: 2, backgroundColor: "#ef4444", opacity: 0.7 }}
                    />
                  )}
                  {n.is_marco ? (
                    <div
                      className="absolute"
                      style={{
                        left: startX - 6,
                        top: 6,
                        width: 0,
                        height: 0,
                        borderLeft: "7px solid transparent",
                        borderRight: "7px solid transparent",
                        borderBottom: "14px solid #f59e0b",
                      }}
                      title={`${n.nome} — ${n.termino_cedo}`}
                    />
                  ) : (
                    <div
                      className="absolute rounded text-[9px] font-medium text-white shadow"
                      style={{
                        left: startX,
                        top: 6,
                        width: barW,
                        height: 16,
                        backgroundColor: corBar,
                      }}
                      title={`${n.nome}\n${n.inicio_cedo} → ${n.termino_cedo}\n${n.duracao_dias}d · folga ${n.folga_total_dias ?? "-"}d`}
                    >
                      {barW > 50 && (
                        <span className="truncate px-1">
                          {n.codigo_wbs}
                          {n.folga_total_dias != null ? ` · f${n.folga_total_dias}` : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <Legend color="#dc2626" label="Caminho crítico" />
        <Legend color="#f59e0b" label="Marco" />
        <Legend color="#dc2626" label="Executor: terceiro" />
        <Legend color="#a855f7" label="Gerenciadora" />
        <Legend color="#16a34a" label="Interno" />
        <span className="ml-auto">Linha vermelha vertical = hoje</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
