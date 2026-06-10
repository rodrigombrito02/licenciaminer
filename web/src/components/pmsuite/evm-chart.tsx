"use client";

import { useMemo } from "react";
import { type EVMSnapshot } from "@/lib/pmsuite-api";

export function EVMChart({ snapshots }: { snapshots: EVMSnapshot[] }) {
  const { width, height, chart, xForDate, yForValue, bac, maxDate, minDate } = useMemo(() => {
    const w = 900;
    const h = 320;
    const padL = 60;
    const padR = 20;
    const padT = 20;
    const padB = 40;
    if (snapshots.length === 0) {
      return {
        width: w,
        height: h,
        chart: { w: w - padL - padR, h: h - padT - padB, padL, padT },
        xForDate: () => 0,
        yForValue: () => 0,
        bac: 0,
        maxDate: new Date(),
        minDate: new Date(),
      };
    }
    const ordered = [...snapshots].sort((a, b) => a.data_snapshot.localeCompare(b.data_snapshot));
    const dates = ordered.map((s) => new Date(s.data_snapshot).getTime());
    const minD = Math.min(...dates);
    const maxD = Math.max(...dates);
    const bac = ordered[0].bac;
    const allVals: number[] = [];
    for (const s of ordered) {
      allVals.push(s.pv, s.ev, s.ac);
      if (s.eac) allVals.push(s.eac);
    }
    allVals.push(bac);
    const maxV = Math.max(...allVals) * 1.05;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const xFor = (d: Date | string) => {
      const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
      if (maxD === minD) return padL;
      return padL + ((t - minD) / (maxD - minD)) * chartW;
    };
    const yFor = (v: number) => padT + chartH - (v / maxV) * chartH;

    return {
      width: w,
      height: h,
      chart: { w: chartW, h: chartH, padL, padT },
      xForDate: xFor,
      yForValue: yFor,
      bac,
      minDate: new Date(minD),
      maxDate: new Date(maxD),
    };
  }, [snapshots]);

  if (snapshots.length === 0) {
    return <p className="text-xs text-muted-foreground">Sem snapshots EVM.</p>;
  }

  const ordered = [...snapshots].sort((a, b) => a.data_snapshot.localeCompare(b.data_snapshot));

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
      notation: "compact",
    }).format(v);

  const pathFor = (key: "pv" | "ev" | "ac") =>
    ordered
      .map((s) => {
        const x = xForDate(s.data_snapshot);
        const y = yForValue(s[key]);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* BAC line */}
      <line
        x1={chart.padL}
        y1={yForValue(bac)}
        x2={chart.padL + chart.w}
        y2={yForValue(bac)}
        stroke="#64748b"
        strokeDasharray="5 5"
      />
      <text x={chart.padL + chart.w - 40} y={yForValue(bac) - 4} fontSize={10} fill="#64748b">
        BAC {fmt(bac)}
      </text>

      {/* PV line */}
      <polyline points={pathFor("pv")} fill="none" stroke="#0ea5e9" strokeWidth={2} />
      {/* EV line */}
      <polyline points={pathFor("ev")} fill="none" stroke="#16a34a" strokeWidth={2} />
      {/* AC line */}
      <polyline points={pathFor("ac")} fill="none" stroke="#dc2626" strokeWidth={2} />

      {/* Points */}
      {ordered.map((s, i) => (
        <g key={i}>
          <circle cx={xForDate(s.data_snapshot)} cy={yForValue(s.pv)} r={3} fill="#0ea5e9" />
          <circle cx={xForDate(s.data_snapshot)} cy={yForValue(s.ev)} r={3} fill="#16a34a" />
          <circle cx={xForDate(s.data_snapshot)} cy={yForValue(s.ac)} r={3} fill="#dc2626" />
        </g>
      ))}

      {/* X axis labels */}
      {ordered.map((s, i) => (
        <text
          key={i}
          x={xForDate(s.data_snapshot)}
          y={height - 15}
          fontSize={9}
          fill="#64748b"
          textAnchor="middle"
        >
          {s.periodo ?? s.data_snapshot.slice(0, 7)}
        </text>
      ))}

      {/* Y axis label */}
      <text x={8} y={chart.padT + 10} fontSize={10} fill="#64748b">
        {fmt(bac)}
      </text>
      <text x={8} y={chart.padT + chart.h + 4} fontSize={10} fill="#64748b">
        0
      </text>

      {/* Legend */}
      <g transform={`translate(${chart.padL + 10}, ${chart.padT + 5})`}>
        <rect x={0} y={0} width={12} height={2} fill="#0ea5e9" />
        <text x={15} y={4} fontSize={10} fill="#0f172a">PV (planejado)</text>
        <rect x={100} y={0} width={12} height={2} fill="#16a34a" />
        <text x={115} y={4} fontSize={10} fill="#0f172a">EV (realizado)</text>
        <rect x={220} y={0} width={12} height={2} fill="#dc2626" />
        <text x={235} y={4} fontSize={10} fill="#0f172a">AC (custo real)</text>
      </g>
    </svg>
  );
}
