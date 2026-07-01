"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  fetchCommodities,
  fetchComexYearly,
  fetchComexByUF,
  fetchComexByCountry,
  fetchCommodityTimeSeries,
  type CommodityResponse,
} from "@/lib/api";
import { fmtUSD, fmtBR } from "@/lib/format";
import { MetricChart } from "./metric-chart";
import { COLORS, type PresetConfig } from "./chart-helpers";
// fmtUSD é usado nos presets locais abaixo.

/**
 * Presets locais da aba "Preço".
 *
 * Diferem dos MERCADO_PRESETS globais: câmbio USD/BRL removido e Níquel (LME)
 * incluído. O gráfico inicia em Minério de Ferro (primeiro preset).
 */
const PRECO_PRESETS: PresetConfig[] = [
  {
    id: "commodity-ferro",
    label: "Minério de Ferro 62% Fe CFR",
    mode: "composed",
    xKey: "data",
    series: [
      { key: "preco", label: "Ferro 62% Fe", type: "line", yAxisId: "left", color: COLORS.danger, format: fmtUSD },
    ],
    fonte: "Fonte: Investing.com — CFR Tianjin",
  },
  {
    id: "commodity-ouro",
    label: "Ouro (USD/oz)",
    mode: "composed",
    xKey: "data",
    series: [
      { key: "preco", label: "Ouro", type: "line", yAxisId: "left", color: COLORS.gold, format: fmtUSD },
    ],
    fonte: "Fonte: Investing.com",
  },
  {
    id: "commodity-niquel",
    label: "Níquel LME (USD/t)",
    mode: "composed",
    xKey: "data",
    series: [
      { key: "preco", label: "Níquel LME", type: "line", yAxisId: "left", color: COLORS.chart2, format: fmtUSD },
    ],
    fonte: "Fonte: LME / Trading Economics",
  },
  {
    id: "commodity-cobre",
    label: "Cobre LME (USD/t)",
    mode: "composed",
    xKey: "data",
    series: [
      { key: "preco", label: "Cobre LME", type: "line", yAxisId: "left", color: COLORS.chart3, format: fmtUSD },
    ],
    fonte: "Fonte: LME / Trading Economics",
  },
  {
    id: "commodity-litio",
    label: "Lítio Li₂CO₃ (USD/t)",
    mode: "composed",
    xKey: "data",
    series: [
      { key: "preco", label: "Lítio Carbonato", type: "line", yAxisId: "left", color: COLORS.chart4, format: fmtUSD },
    ],
    fonte: "Fonte: Fastmarkets",
  },
  {
    id: "comex-anual",
    label: "Comércio Exterior (Anual)",
    mode: "bar-v",
    xKey: "ano",
    series: [
      { key: "Exportação", label: "Exportação", type: "bar", yAxisId: "left", color: COLORS.teal, format: fmtUSD },
      { key: "Importação", label: "Importação", type: "bar", yAxisId: "left", color: COLORS.orange, format: fmtUSD },
    ],
    fonte: "Fonte: Comex Stat / MDIC — NCM Cap. 26 (Minérios)",
  },
  {
    id: "comex-pais",
    label: "Comércio por País",
    mode: "bar-h",
    xKey: "valor_fob_usd",
    yKey: "pais",
    series: [
      { key: "valor_fob_usd", label: "USD FOB", type: "bar", yAxisId: "left", color: COLORS.teal, format: fmtUSD },
    ],
    fonte: "Fonte: Comex Stat / MDIC",
  },
  {
    id: "comex-uf",
    label: "Comércio por UF",
    mode: "bar-h",
    xKey: "valor_fob_usd",
    yKey: "uf",
    series: [
      { key: "valor_fob_usd", label: "USD FOB", type: "bar", yAxisId: "left", color: COLORS.chart2, format: fmtUSD },
    ],
    fonte: "Fonte: Comex Stat / MDIC",
  },
];

/** Mapeia preset de commodity → nome do mineral na base de commodities. */
const COMMODITY_MINERAL_MAP: Record<string, string> = {
  "commodity-ferro": "Minerio de Ferro (62% Fe CFR)",
  "commodity-ouro": "Ouro",
  "commodity-niquel": "Niquel (LME)",
  "commodity-cobre": "Cobre (LME)",
  "commodity-litio": "Litio (Li2CO3)",
};

const DEFAULT_PRESET = "commodity-ferro";

interface MercadoTabProps {
  activeMetric: string;
  onMetricChange: (id: string) => void;
}

export function MercadoTab({ activeMetric, onMetricChange }: MercadoTabProps) {
  const [commodities, setCommodities] = useState<CommodityResponse | null>(null);
  const [comexYearly, setComexYearly] = useState<Record<string, unknown>[] | null>(null);
  const [comexByUF, setComexByUF] = useState<Record<string, unknown>[] | null>(null);
  const [comexByCountry, setComexByCountry] = useState<Record<string, unknown>[] | null>(null);
  const [commodityByMineral, setCommodityByMineral] = useState<
    Record<string, Record<string, unknown>[]>
  >({});
  const [loading, setLoading] = useState(true);

  // Garante que a aba inicie em Minério de Ferro se o metric ativo não pertence
  // aos presets de Preço (ex.: veio de "cambio", que foi removido).
  const effectiveMetric = useMemo(
    () => (PRECO_PRESETS.some((p) => p.id === activeMetric) ? activeMetric : DEFAULT_PRESET),
    [activeMetric]
  );

  useEffect(() => {
    if (!PRECO_PRESETS.some((p) => p.id === activeMetric)) {
      onMetricChange(DEFAULT_PRESET);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mineralFetches = Object.entries(COMMODITY_MINERAL_MAP).map(
      ([presetId, mineralName]) =>
        fetchCommodityTimeSeries(mineralName)
          .then((r) => ({ presetId, rows: r.rows }))
          .catch(() => ({ presetId, rows: [] }))
    );

    Promise.all([
      fetchCommodities().then(setCommodities).catch(() => {}),
      fetchComexYearly().then((r) => {
        const pivot: Record<number, Record<string, unknown>> = {};
        for (const row of r.rows) {
          if (!pivot[row.ano]) pivot[row.ano] = { ano: row.ano };
          pivot[row.ano][row.fluxo] = row.valor_fob_usd;
        }
        setComexYearly(Object.values(pivot).sort((a, b) => (a.ano as number) - (b.ano as number)));
      }),
      fetchComexByUF().then((r) => setComexByUF(r.rows)),
      fetchComexByCountry().then((r) => setComexByCountry(r.rows)),
      Promise.all(mineralFetches).then((results) => {
        const byMineral: Record<string, Record<string, unknown>[]> = {};
        for (const { presetId, rows } of results) {
          byMineral[presetId] = rows as Record<string, unknown>[];
        }
        setCommodityByMineral(byMineral);
      }),
    ])
      .catch((e) => console.error("preco:", e))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useCallback((): Record<string, unknown>[] | null => {
    switch (effectiveMetric) {
      case "commodity-ferro":
      case "commodity-ouro":
      case "commodity-niquel":
      case "commodity-cobre":
      case "commodity-litio":
        return commodityByMineral[effectiveMetric] ?? null;
      case "comex-anual":
        return comexYearly;
      case "comex-pais":
        return comexByCountry as Record<string, unknown>[] | null;
      case "comex-uf":
        return comexByUF as Record<string, unknown>[] | null;
      default:
        return null;
    }
  }, [effectiveMetric, commodityByMineral, comexYearly, comexByCountry, comexByUF]);

  return (
    <div className="space-y-4">
      <MetricChart
        presets={PRECO_PRESETS}
        activePreset={effectiveMetric}
        onPresetChange={onMetricChange}
        data={chartData()}
        loading={loading}
      />

      {/* Cards de preço das commodities (inclui níquel) */}
      {commodities && commodities.latest && Object.keys(commodities.latest).length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {Object.entries(commodities.latest).map(([mineral, data]) => (
            <div key={mineral} className="rounded-lg border p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
                {mineral.split("(")[0].trim()}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">
                {data.preco_usd ?? "—"}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {data.unidade} · {data.data?.slice(0, 7)}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60">
        Preços em USD. Cotações de referência internacional ·{" "}
        {fmtBR(Object.keys(commodities?.latest ?? {}).length)} commodities monitoradas.
      </p>
    </div>
  );
}
