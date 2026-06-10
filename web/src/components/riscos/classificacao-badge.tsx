"use client";

import {
  CLASSIFICACAO_COLOR,
  CLASSIFICACAO_LABEL,
  type Classificacao,
} from "@/lib/riscos-api";

export function ClassificacaoBadge({
  value,
}: {
  value?: Classificacao | string | null;
}) {
  if (!value) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const cls = value as Classificacao;
  const label = CLASSIFICACAO_LABEL[cls] ?? value;
  const color = CLASSIFICACAO_COLOR[cls] ?? "#64748b";
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {cls} — {label}
    </span>
  );
}
