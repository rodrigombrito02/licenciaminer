"use client";

import Link from "next/link";
import {
  CLASSIFICACAO_COLOR,
  CLASSIFICACAO_LABEL,
  CLASSIFICACAO_ORDER,
  type Classificacao,
} from "@/lib/riscos-api";

interface Props {
  nome: string;
  subtitulo?: string;
  total: number;
  distribuicao: Record<string, number>;
  href?: string;
  compact?: boolean;
}

export function HeatmapCaixinha({
  nome,
  subtitulo,
  total,
  distribuicao,
  href,
  compact,
}: Props) {
  const pior: Classificacao | null = (["C", "MS", "S", "PS"] as Classificacao[]).find(
    (c) => (distribuicao[c] ?? 0) > 0,
  ) as Classificacao | undefined ?? null;

  const bg = pior ? `${CLASSIFICACAO_COLOR[pior]}22` : undefined;
  const border = pior ? `${CLASSIFICACAO_COLOR[pior]}99` : undefined;

  const inner = (
    <div
      className={`flex flex-col gap-1 rounded border p-2 transition hover:border-primary ${
        compact ? "min-h-[66px]" : "min-h-[90px]"
      }`}
      style={{
        backgroundColor: bg ?? "transparent",
        borderColor: border ?? undefined,
      }}
    >
      <div className={`font-semibold leading-tight ${compact ? "text-xs" : "text-sm"}`}>
        {nome}
      </div>
      {subtitulo && (
        <div className="text-[10px] uppercase text-muted-foreground">{subtitulo}</div>
      )}
      <div className="mt-auto flex items-center justify-between">
        <span
          className={`font-mono font-bold ${compact ? "text-sm" : "text-lg"}`}
          style={{ color: pior ? CLASSIFICACAO_COLOR[pior] : "var(--muted-foreground)" }}
        >
          {total}
        </span>
        {total > 0 && (
          <div className="flex gap-0.5">
            {CLASSIFICACAO_ORDER.map((c) => {
              const n = distribuicao[c] ?? 0;
              if (n === 0) return null;
              return (
                <span
                  key={c}
                  className="inline-flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[9px] font-bold text-white"
                  style={{ backgroundColor: CLASSIFICACAO_COLOR[c] }}
                  title={`${CLASSIFICACAO_LABEL[c]}: ${n}`}
                >
                  {n}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block no-underline">
      {inner}
    </Link>
  ) : (
    inner
  );
}
