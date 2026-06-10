"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  STATUS_KRI_COLOR,
  addMedicao,
  fetchKRI,
  type KRIDetalhe,
} from "@/lib/monitoramento-api";

export default function KRIDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = use(params);
  const id = Number(idStr);
  const [kri, setKri] = useState<KRIDetalhe | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reload = () => fetchKRI(id).then(setKri);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Chart em SVG simples: série temporal
  const chart = useMemo(() => {
    if (!kri || kri.medicoes.length === 0) return null;
    const meds = [...kri.medicoes].sort((a, b) => a.data.localeCompare(b.data));
    const values = meds.map((m) => m.valor);
    const min = Math.min(...values, kri.limite_verde ?? Infinity);
    const max = Math.max(...values, kri.limite_vermelho ?? -Infinity);
    const range = max - min || 1;
    const pad = range * 0.1;
    const yMin = min - pad;
    const yMax = max + pad;
    const width = 800;
    const height = 220;
    const padLeft = 50;
    const padRight = 20;
    const padTop = 10;
    const padBottom = 30;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;
    const x = (i: number) =>
      padLeft + (i / Math.max(1, meds.length - 1)) * chartW;
    const y = (v: number) =>
      padTop + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

    const points = meds.map((m, i) => `${x(i)},${y(m.valor)}`).join(" ");
    const dots = meds.map((m, i) => ({
      cx: x(i),
      cy: y(m.valor),
      status: m.status ?? "sem_dados",
      data: m.data,
      valor: m.valor,
    }));

    const thresholdLines = [
      { v: kri.limite_verde, color: "#16a34a", label: "verde" },
      { v: kri.limite_amarelo, color: "#eab308", label: "amarelo" },
      { v: kri.limite_vermelho, color: "#dc2626", label: "vermelho" },
    ].filter((t) => t.v != null) as { v: number; color: string; label: string }[];

    return {
      width,
      height,
      padLeft,
      padTop,
      chartW,
      chartH,
      points,
      dots,
      yMin,
      yMax,
      thresholdLines,
      y,
    };
  }, [kri]);

  if (!kri) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const statusColor = STATUS_KRI_COLOR[kri.ultimo_status ?? "sem_dados"];

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-muted-foreground">
          <Link href="/gestao-riscos/kris" className="hover:underline">
            KRIs
          </Link>{" "}
          / <span className="font-mono">{kri.codigo}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{kri.nome}</h1>
            {kri.descricao && (
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                {kri.descricao}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="rounded-lg border-2 border-border p-2 text-center">
              <div className="text-[9px] uppercase text-muted-foreground">Último valor</div>
              <div className="text-2xl font-bold" style={{ color: statusColor }}>
                {kri.ultimo_valor ?? "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">{kri.unidade}</div>
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {kri.categoria_nome && (
            <span>Categoria: <strong>{kri.categoria_nome}</strong></span>
          )}
          {kri.responsavel_nome && (
            <span>Responsável: <strong>{kri.responsavel_nome}</strong></span>
          )}
          <span>Periodicidade: <strong className="capitalize">{kri.periodicidade}</strong></span>
          <span>
            Direção:{" "}
            <strong>
              {kri.direcao === "subir_pior" ? "↑ pior" : "↓ pior"}
            </strong>
          </span>
          {kri.risco_codigo && (
            <span>
              Risco vinculado:{" "}
              <Link
                href={`/gestao-riscos/riscos/${kri.risco_id}`}
                className="font-mono text-primary hover:underline"
              >
                {kri.risco_codigo}
              </Link>
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <ThresholdCard
          label="Verde"
          limite={kri.limite_verde}
          unidade={kri.unidade}
          color="#16a34a"
        />
        <ThresholdCard
          label="Amarelo"
          limite={kri.limite_amarelo}
          unidade={kri.unidade}
          color="#eab308"
        />
        <ThresholdCard
          label="Vermelho"
          limite={kri.limite_vermelho}
          unidade={kri.unidade}
          color="#dc2626"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Histórico de medições</CardTitle>
            {kri.formula_descricao && (
              <p className="mt-1 text-xs text-muted-foreground">
                Fórmula: {kri.formula_descricao}
              </p>
            )}
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ Nova medição</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar medição — {kri.codigo}</DialogTitle>
              </DialogHeader>
              <NovaMedicaoForm
                kriId={kri.id}
                unidade={kri.unidade}
                onSaved={() => {
                  setDialogOpen(false);
                  reload();
                }}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {chart ? (
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              className="w-full h-auto"
            >
              {/* Zonas de risco coloridas */}
              {kri.limite_vermelho != null && (
                <rect
                  x={chart.padLeft}
                  y={
                    kri.direcao === "subir_pior"
                      ? chart.padTop
                      : chart.y(kri.limite_vermelho)
                  }
                  width={chart.chartW}
                  height={
                    kri.direcao === "subir_pior"
                      ? chart.y(kri.limite_vermelho) - chart.padTop
                      : chart.chartH -
                        (chart.y(kri.limite_vermelho) - chart.padTop)
                  }
                  fill="#dc262618"
                />
              )}
              {chart.thresholdLines.map((t, i) => (
                <g key={i}>
                  <line
                    x1={chart.padLeft}
                    y1={chart.y(t.v)}
                    x2={chart.width - 20}
                    y2={chart.y(t.v)}
                    stroke={t.color}
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                  <text
                    x={chart.width - 22}
                    y={chart.y(t.v) - 3}
                    fill={t.color}
                    fontSize={10}
                    textAnchor="end"
                  >
                    {t.label} = {t.v}
                  </text>
                </g>
              ))}
              {/* Linha dos valores */}
              <polyline
                points={chart.points}
                fill="none"
                stroke="#0f172a"
                strokeWidth={2}
              />
              {/* Pontos coloridos */}
              {chart.dots.map((d, i) => (
                <g key={i}>
                  <circle
                    cx={d.cx}
                    cy={d.cy}
                    r={5}
                    fill={STATUS_KRI_COLOR[d.status] ?? "#64748b"}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </g>
              ))}
              {/* Eixo Y labels */}
              <text x={5} y={chart.padTop + 10} fontSize={10} fill="#64748b">
                {Math.round(chart.yMax * 10) / 10}
              </text>
              <text
                x={5}
                y={chart.padTop + chart.chartH + 4}
                fontSize={10}
                fill="#64748b"
              >
                {Math.round(chart.yMin * 10) / 10}
              </text>
              {/* Eixo X: datas inicial e final */}
              <text
                x={chart.padLeft}
                y={chart.height - 10}
                fontSize={10}
                fill="#64748b"
              >
                {chart.dots[0]?.data}
              </text>
              <text
                x={chart.width - 20}
                y={chart.height - 10}
                fontSize={10}
                fill="#64748b"
                textAnchor="end"
              >
                {chart.dots[chart.dots.length - 1]?.data}
              </text>
            </svg>
          ) : (
            <p className="text-xs text-muted-foreground">Sem medições para gráfico.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Medições registradas ({kri.medicoes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor ({kri.unidade})</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...kri.medicoes]
                .sort((a, b) => b.data.localeCompare(a.data))
                .map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.data}</TableCell>
                    <TableCell className="text-right font-mono">{m.valor}</TableCell>
                    <TableCell>
                      <span
                        className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                        style={{ backgroundColor: STATUS_KRI_COLOR[m.status ?? "sem_dados"] }}
                      >
                        {m.status ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{m.observacao ?? "—"}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ThresholdCard({
  label,
  limite,
  unidade,
  color,
}: {
  label: string;
  limite?: number | null;
  unidade: string;
  color: string;
}) {
  return (
    <Card style={{ borderColor: `${color}55` }}>
      <CardContent className="py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs uppercase font-semibold" style={{ color }}>
            {label}
          </span>
        </div>
        <div className="mt-1 text-xl font-bold">
          {limite ?? "—"} <span className="text-xs font-normal text-muted-foreground">{unidade}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function NovaMedicaoForm({
  kriId,
  unidade,
  onSaved,
}: {
  kriId: number;
  unidade: string;
  onSaved: () => void;
}) {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valor) return;
        setSaving(true);
        try {
          await addMedicao(kriId, {
            data,
            valor: Number(valor),
            observacao: obs || undefined,
          });
          onSaved();
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium">Data</label>
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Valor ({unidade})</label>
        <Input
          type="number"
          step="any"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Observação</label>
        <textarea
          className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Salvando…" : "Registrar medição"}
      </Button>
    </form>
  );
}
