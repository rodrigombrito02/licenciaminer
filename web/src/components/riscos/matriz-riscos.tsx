"use client";

import Link from "next/link";
import {
  CLASSIFICACAO_COLOR,
  CLASSIFICACAO_LABEL,
  type Classificacao,
  type EscalaImpacto as EscalaImpactoT,
  type EscalaProb,
  type MatrizCellComRiscos,
} from "@/lib/riscos-api";

interface MatrizRiscosProps {
  celulas: MatrizCellComRiscos[];
  escalaProb: EscalaProb[];
  escalaImpacto: EscalaImpactoT[];
  impactoCategoria?: string;
  onCellClick?: (cell: MatrizCellComRiscos) => void;
}

export function MatrizRiscos({
  celulas,
  escalaProb,
  escalaImpacto,
  impactoCategoria,
  onCellClick,
}: MatrizRiscosProps) {
  const cats = Array.from(new Set(escalaImpacto.map((e) => e.categoria)));
  const catAtiva = impactoCategoria && cats.includes(impactoCategoria)
    ? impactoCategoria
    : cats[0] ?? "pessoal";

  const probSorted = [...escalaProb].sort((a, b) => b.nivel - a.nivel);
  const impactoFiltrado = escalaImpacto
    .filter((e) => e.categoria === catAtiva)
    .sort((a, b) => a.nivel - b.nivel);

  const cellMap = new Map<string, MatrizCellComRiscos>();
  for (const c of celulas) cellMap.set(`${c.prob}-${c.impacto}`, c);

  return (
    <div className="overflow-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="bg-muted/30 px-2 py-2 text-left text-[10px] uppercase text-muted-foreground">
              Probabilidade ↓ / Impacto →
            </th>
            {impactoFiltrado.map((i) => (
              <th
                key={i.nivel}
                className="bg-muted/30 px-2 py-2 text-center font-medium"
                title={i.descricao ?? ""}
              >
                <div className="text-[10px] text-muted-foreground">{i.nivel}</div>
                <div>{i.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {probSorted.map((p) => (
            <tr key={p.nivel}>
              <th
                className="bg-muted/30 px-2 py-2 text-left font-medium"
                title={p.descricao ?? ""}
              >
                <div className="text-[10px] text-muted-foreground">{p.nivel}</div>
                <div>{p.label}</div>
              </th>
              {impactoFiltrado.map((i) => {
                const cell = cellMap.get(`${p.nivel}-${i.nivel}`);
                const classificacao = (cell?.classificacao ?? "PS") as Classificacao;
                const riscos = cell?.riscos ?? [];
                return (
                  <td
                    key={i.nivel}
                    className="min-w-[110px] cursor-pointer rounded border border-white/20 p-2 align-top transition hover:brightness-110"
                    style={{
                      backgroundColor: `${CLASSIFICACAO_COLOR[classificacao]}CC`,
                      color: "#fff",
                    }}
                    onClick={() => cell && onCellClick?.(cell)}
                    title={CLASSIFICACAO_LABEL[classificacao]}
                  >
                    <div className="mb-1 text-[10px] font-semibold uppercase opacity-80">
                      {classificacao}
                    </div>
                    {riscos.length === 0 ? (
                      <div className="text-[10px] opacity-70">—</div>
                    ) : (
                      <ul className="space-y-0.5">
                        {riscos.slice(0, 4).map((r) => (
                          <li key={r.id} className="truncate">
                            <Link
                              href={`/gestao-riscos/riscos/${r.id}`}
                              className="font-medium underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.codigo}
                            </Link>{" "}
                            <span className="opacity-90">{r.nome}</span>
                          </li>
                        ))}
                        {riscos.length > 4 && (
                          <li className="text-[10px] opacity-80">
                            +{riscos.length - 4} mais
                          </li>
                        )}
                      </ul>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {cats.length > 1 && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          Categoria de impacto exibida: <strong>{catAtiva}</strong>
          {" — "}
          outras categorias disponíveis: {cats.filter((c) => c !== catAtiva).join(", ")}
        </div>
      )}
    </div>
  );
}
