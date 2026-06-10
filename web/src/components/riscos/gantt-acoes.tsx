"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_ACAO_COLOR, type GanttAcao, type Risco } from "@/lib/riscos-api";

const DAY_MS = 1000 * 60 * 60 * 24;
const LABEL_COL_WIDTH = 320;

const TIPO_COLOR = {
  preventiva: "#3b82f6",
  corretiva: "#dc2626",
};

type Scale = "day" | "week" | "month" | "quarter" | "year";

interface ScaleConfig {
  pxPerDay: number;
  padDaysBefore: number;
  padDaysAfter: number;
  /** Retorna array de marcadores: tick date + label + importância (major=true desenha linha forte) */
  buildTicks: (minDate: Date, maxDate: Date) => { date: Date; label: string; major: boolean }[];
  headerHeight: number;
}

const MONTH_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function buildDayTicks(min: Date, max: Date) {
  const ticks: { date: Date; label: string; major: boolean }[] = [];
  const d = new Date(min.getFullYear(), min.getMonth(), min.getDate());
  while (d <= max) {
    const day = d.getDate();
    const isMajor = day === 1;
    ticks.push({
      date: new Date(d),
      label: isMajor
        ? `${MONTH_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
        : String(day),
      major: isMajor,
    });
    d.setDate(d.getDate() + 1);
  }
  return ticks;
}

function buildWeekTicks(min: Date, max: Date) {
  const ticks: { date: Date; label: string; major: boolean }[] = [];
  const d = new Date(min.getFullYear(), min.getMonth(), min.getDate());
  // Alinhar ao início da semana (segunda)
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  while (d <= max) {
    const firstOfMonth = d.getDate() <= 7;
    ticks.push({
      date: new Date(d),
      label: firstOfMonth
        ? `${MONTH_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
        : `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`,
      major: firstOfMonth,
    });
    d.setDate(d.getDate() + 7);
  }
  return ticks;
}

function buildMonthTicks(min: Date, max: Date) {
  const ticks: { date: Date; label: string; major: boolean }[] = [];
  const d = new Date(min.getFullYear(), min.getMonth(), 1);
  while (d <= max) {
    const isJan = d.getMonth() === 0;
    ticks.push({
      date: new Date(d),
      label: isJan
        ? `${d.getFullYear()}`
        : `${MONTH_SHORT[d.getMonth()]}${isJan ? "/" + String(d.getFullYear()).slice(2) : ""}`,
      major: isJan,
    });
    d.setMonth(d.getMonth() + 1);
  }
  return ticks;
}

function buildQuarterTicks(min: Date, max: Date) {
  const ticks: { date: Date; label: string; major: boolean }[] = [];
  const startMonth = Math.floor(min.getMonth() / 3) * 3;
  const d = new Date(min.getFullYear(), startMonth, 1);
  while (d <= max) {
    const q = Math.floor(d.getMonth() / 3) + 1;
    const isQ1 = q === 1;
    ticks.push({
      date: new Date(d),
      label: isQ1 ? `${d.getFullYear()} · T${q}` : `T${q}`,
      major: isQ1,
    });
    d.setMonth(d.getMonth() + 3);
  }
  return ticks;
}

function buildYearTicks(min: Date, max: Date) {
  const ticks: { date: Date; label: string; major: boolean }[] = [];
  const d = new Date(min.getFullYear(), 0, 1);
  while (d <= max) {
    ticks.push({
      date: new Date(d),
      label: `${d.getFullYear()}`,
      major: true,
    });
    d.setFullYear(d.getFullYear() + 1);
  }
  return ticks;
}

const SCALES: Record<Scale, ScaleConfig> = {
  day: {
    pxPerDay: 28,
    padDaysBefore: 3,
    padDaysAfter: 3,
    buildTicks: buildDayTicks,
    headerHeight: 44,
  },
  week: {
    pxPerDay: 7,
    padDaysBefore: 7,
    padDaysAfter: 7,
    buildTicks: buildWeekTicks,
    headerHeight: 44,
  },
  month: {
    pxPerDay: 2.2,
    padDaysBefore: 15,
    padDaysAfter: 15,
    buildTicks: buildMonthTicks,
    headerHeight: 44,
  },
  quarter: {
    pxPerDay: 0.9,
    padDaysBefore: 30,
    padDaysAfter: 30,
    buildTicks: buildQuarterTicks,
    headerHeight: 44,
  },
  year: {
    pxPerDay: 0.3,
    padDaysBefore: 90,
    padDaysAfter: 90,
    buildTicks: buildYearTicks,
    headerHeight: 44,
  },
};

type GroupBy = "risco" | "responsavel" | "area" | "none";

interface Props {
  acoes: GanttAcao[];
  riscos: Risco[];
}

function formatBR(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}/${d.getFullYear()}`;
}

export function GanttAcoes({ acoes, riscos }: Props) {
  const [riscoFilter, setRiscoFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("risco");
  const [scale, setScale] = useState<Scale>("month");

  const filtered = useMemo(() => {
    if (riscoFilter === "all") return acoes;
    return acoes.filter((a) => String(a.risco_id) === riscoFilter);
  }, [acoes, riscoFilter]);

  const cfg = SCALES[scale];

  const { minDate, maxDate, totalDays, timelineWidth } = useMemo(() => {
    if (filtered.length === 0) {
      const today = new Date();
      return {
        minDate: today,
        maxDate: today,
        totalDays: 1,
        timelineWidth: 200,
      };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const a of filtered) {
      min = Math.min(min, new Date(a.data_inicio).getTime());
      max = Math.max(max, new Date(a.data_fim).getTime());
    }
    const minD = new Date(min - cfg.padDaysBefore * DAY_MS);
    const maxD = new Date(max + cfg.padDaysAfter * DAY_MS);
    const days = Math.max(1, Math.ceil((maxD.getTime() - minD.getTime()) / DAY_MS));
    return {
      minDate: minD,
      maxDate: maxD,
      totalDays: days,
      timelineWidth: Math.max(600, days * cfg.pxPerDay),
    };
  }, [filtered, cfg]);

  const ticks = useMemo(
    () => cfg.buildTicks(minDate, maxDate),
    [cfg, minDate, maxDate],
  );

  const posX = (date: Date): number => {
    return ((date.getTime() - minDate.getTime()) / DAY_MS) * cfg.pxPerDay;
  };

  const groups = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", acoes: filtered }];
    }
    const map = new Map<string, GanttAcao[]>();
    for (const a of filtered) {
      let key = "(sem)";
      if (groupBy === "risco") key = a.risco_codigo ?? String(a.risco_id);
      else if (groupBy === "responsavel") key = a.responsavel_nome ?? "(sem responsável)";
      else if (groupBy === "area") key = a.area ?? "(sem área)";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([key, acoes]) => ({ key, label: key, acoes }));
  }, [filtered, groupBy]);

  const today = new Date();
  const todayX = today >= minDate && today <= maxDate ? posX(today) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase text-muted-foreground">
            Filtrar por risco
          </label>
          <Select value={riscoFilter} onValueChange={setRiscoFilter}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os riscos ({acoes.length})</SelectItem>
              {riscos.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.codigo} — {r.nome.slice(0, 50)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase text-muted-foreground">
            Agrupar por
          </label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risco">Risco</SelectItem>
              <SelectItem value="responsavel">Responsável</SelectItem>
              <SelectItem value="area">Área</SelectItem>
              <SelectItem value="none">Sem agrupamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase text-muted-foreground">
            Escala
          </label>
          <Select value={scale} onValueChange={(v) => setScale(v as Scale)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Dia</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} ações · {formatBR(minDate)} → {formatBR(maxDate)} ({totalDays}d)
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto rounded-md border border-border bg-card max-h-[70vh]">
        <div style={{ width: LABEL_COL_WIDTH + timelineWidth + 8 }}>
          {/* HEADER da timeline */}
          <div className="sticky top-0 z-20 flex bg-muted/40 border-b-2 border-border shadow-sm">
            <div
              className="shrink-0 border-r-2 border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              style={{ width: LABEL_COL_WIDTH, height: cfg.headerHeight }}
            >
              Ação · Risco
            </div>
            <div
              className="relative shrink-0"
              style={{ width: timelineWidth, height: cfg.headerHeight }}
            >
              {ticks.map((t, i) => {
                const x = posX(t.date);
                return (
                  <div
                    key={i}
                    className={`absolute top-0 flex h-full flex-col justify-center overflow-hidden whitespace-nowrap px-1.5 ${
                      t.major
                        ? "text-[11px] font-bold text-foreground"
                        : "text-[10px] text-muted-foreground"
                    }`}
                    style={{
                      left: x,
                      borderLeft: t.major
                        ? "2px solid #334155"
                        : "1px solid #cbd5e1",
                      height: cfg.headerHeight,
                    }}
                  >
                    {t.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROWS */}
          {groups.map((g) => (
            <div key={g.key}>
              {groupBy !== "none" && (
                <div className="flex border-b border-border bg-muted/15">
                  <div
                    className="shrink-0 border-r border-border px-3 py-1.5 text-xs font-semibold"
                    style={{ width: LABEL_COL_WIDTH }}
                  >
                    {g.label}{" "}
                    <span className="text-muted-foreground/70">({g.acoes.length})</span>
                  </div>
                  <div
                    className="relative shrink-0"
                    style={{ width: timelineWidth }}
                  />
                </div>
              )}
              {g.acoes.map((a) => {
                const start = new Date(a.data_inicio);
                const end = new Date(a.data_fim);
                const startX = posX(start);
                const endX = posX(end);
                const width = Math.max(4, endX - startX);
                const color =
                  STATUS_ACAO_COLOR[a.status] ??
                  TIPO_COLOR[a.tipo as keyof typeof TIPO_COLOR] ??
                  "#64748b";
                return (
                  <div
                    key={a.id}
                    className="flex min-h-[34px] items-center border-b border-border/40 hover:bg-muted/20"
                  >
                    <div
                      className="shrink-0 border-r border-border px-3 py-1"
                      style={{ width: LABEL_COL_WIDTH }}
                    >
                      <div className="flex items-center gap-1 text-[11px]">
                        <Link
                          href={`/gestao-riscos/riscos/${a.risco_id}`}
                          className="font-mono text-[9px] text-muted-foreground hover:underline"
                        >
                          {a.risco_codigo}
                        </Link>
                        {a.codigo && (
                          <span className="rounded bg-muted px-1 font-mono text-[9px] text-muted-foreground">
                            {a.codigo}
                          </span>
                        )}
                      </div>
                      <div className="line-clamp-1 text-[11px] leading-tight">
                        {a.descricao}
                      </div>
                      <div className="truncate text-[9px] text-muted-foreground">
                        {a.responsavel_nome ?? "—"}
                        {a.area ? ` · ${a.area}` : ""}
                      </div>
                    </div>
                    <div
                      className="relative shrink-0"
                      style={{ width: timelineWidth, height: 34 }}
                    >
                      {/* Grid de ticks */}
                      {ticks.map((t, i) => (
                        <div
                          key={i}
                          className="absolute top-0 h-full"
                          style={{
                            left: posX(t.date),
                            width: 1,
                            backgroundColor: t.major ? "#cbd5e1" : "#e2e8f0",
                          }}
                        />
                      ))}
                      {/* Linha do hoje */}
                      {todayX !== null && (
                        <div
                          className="absolute top-0 h-full"
                          style={{
                            left: todayX,
                            width: 2,
                            backgroundColor: "#ef4444",
                            opacity: 0.7,
                          }}
                          title="Hoje"
                        />
                      )}
                      {/* Barra da ação */}
                      <div
                        className="absolute flex items-center justify-start overflow-hidden rounded text-[10px] font-medium text-white shadow"
                        style={{
                          left: startX,
                          top: 6,
                          width,
                          height: 22,
                          backgroundColor: color,
                        }}
                        title={`${a.descricao}\n${formatBR(start)} → ${formatBR(end)}\n${a.status} (${a.percentual}%)\n${a.responsavel_nome ?? ""}`}
                      >
                        {width > 60 && (
                          <span className="truncate px-1.5">
                            {a.status}
                            {a.percentual > 0 && width > 110
                              ? ` · ${a.percentual}%`
                              : ""}
                          </span>
                        )}
                        {/* Indicador de progresso */}
                        {a.percentual > 0 && a.percentual < 100 && width > 20 && (
                          <div
                            className="absolute bottom-0 left-0 h-1 bg-white/70"
                            style={{ width: `${a.percentual}%` }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma ação com datas no período.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <LegendItem color={STATUS_ACAO_COLOR.concluida} label="Concluída" />
        <LegendItem color={STATUS_ACAO_COLOR.em_andamento} label="Em andamento" />
        <LegendItem color={STATUS_ACAO_COLOR.nao_iniciada} label="Não iniciada" />
        <LegendItem color={STATUS_ACAO_COLOR.atrasada} label="Atrasada" />
        <LegendItem color={TIPO_COLOR.preventiva} label="Preventiva (fallback)" />
        <LegendItem color={TIPO_COLOR.corretiva} label="Corretiva (fallback)" />
        <span className="ml-auto">Linha vermelha vertical = hoje · barra branca interna = progresso</span>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
