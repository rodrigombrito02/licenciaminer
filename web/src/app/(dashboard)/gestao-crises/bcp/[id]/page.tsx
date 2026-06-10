"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchProcessoCritico,
  type ProcessoDetalhe,
} from "@/lib/crises-api";

const STATUS_TESTE_COLOR: Record<string, string> = {
  aprovado: "#16a34a",
  aprovado_com_ressalvas: "#eab308",
  reprovado: "#dc2626",
  planejado: "#64748b",
};

export default function ProcessoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = use(params);
  const id = Number(idStr);
  const [p, setP] = useState<ProcessoDetalhe | null>(null);

  useEffect(() => {
    fetchProcessoCritico(id).then(setP);
  }, [id]);

  if (!p) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const fmtBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(v);
  const fmtHrs = (v: number | null | undefined) =>
    v == null ? "—" : v < 24 ? `${v}h` : `${Math.round(v / 24)}d (${v}h)`;

  const prioColor =
    p.prioridade === 5
      ? "#dc2626"
      : p.prioridade === 4
      ? "#f59e0b"
      : p.prioridade === 3
      ? "#0ea5e9"
      : "#64748b";

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-muted-foreground">
          <Link href="/gestao-crises/bcp" className="hover:underline">
            BCP / Processos críticos
          </Link>{" "}
          / <span className="font-mono">{p.codigo}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{p.nome}</h1>
            {p.descricao && (
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{p.descricao}</p>
            )}
          </div>
          <div
            className="rounded px-3 py-1 text-sm font-bold text-white"
            style={{ backgroundColor: prioColor }}
          >
            Prioridade P{p.prioridade}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {p.area && <span>Área: <strong>{p.area}</strong></span>}
          {p.responsavel_nome && (
            <span>Responsável: <strong>{p.responsavel_nome}</strong></span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="RTO (Recovery Time Objective)"
          value={fmtHrs(p.rto_horas)}
          sub="Tempo máximo aceitável até processo restabelecido"
        />
        <MetricCard
          label="RPO (Recovery Point Objective)"
          value={fmtHrs(p.rpo_horas)}
          sub="Perda máxima aceitável de dados/estado"
        />
        <MetricCard
          label="MTD (Max Tolerable Downtime)"
          value={fmtHrs(p.mtd_horas)}
          sub="Além disso = comprometimento do negócio"
        />
        <MetricCard
          label="Impacto financeiro/hora"
          value={p.impacto_financeiro_hora ? fmtBRL(p.impacto_financeiro_hora) : "—"}
          sub="Estimativa de perda direta"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dependências</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {p.dependencias ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recursos mínimos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {p.recursos_minimos ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {p.planos.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Nenhum plano de recuperação cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        p.planos.map((pl) => (
          <Card key={pl.id}>
            <CardHeader>
              <CardTitle className="text-base">{pl.titulo}</CardTitle>
              <p className="text-xs text-muted-foreground">
                versão {pl.versao}
                {pl.data_revisao ? ` · revisado em ${pl.data_revisao}` : ""}
                {pl.aprovador_nome ? ` · aprovado por ${pl.aprovador_nome}` : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pl.descricao && (
                <p className="text-sm text-muted-foreground">{pl.descricao}</p>
              )}

              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Passos do plano ({pl.steps.length})
                </h4>
                <div className="space-y-2">
                  {pl.steps.map((s) => (
                    <div
                      key={s.id}
                      className="flex gap-3 rounded border border-border p-2 text-sm"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 font-bold text-primary">
                        {s.ordem + 1}
                      </div>
                      <div className="flex-1">
                        <div>{s.descricao}</div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                          {s.tempo_estimado_min !== null && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {s.tempo_estimado_min === 0
                                ? "imediato"
                                : s.tempo_estimado_min! < 60
                                ? `${s.tempo_estimado_min} min`
                                : `~${Math.round((s.tempo_estimado_min! / 60) * 10) / 10}h`}
                            </span>
                          )}
                          {s.recursos && <span>📦 {s.recursos}</span>}
                          {s.responsavel_nome && <span>👤 {s.responsavel_nome}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {pl.testes.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Histórico de testes ({pl.testes.length})
                  </h4>
                  <div className="space-y-2">
                    {pl.testes.map((t) => {
                      const color = STATUS_TESTE_COLOR[t.status] ?? "#64748b";
                      return (
                        <div
                          key={t.id}
                          className="rounded border border-border p-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">{t.data}</span>
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase">
                              {t.tipo}
                            </span>
                            <span
                              className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                              style={{
                                backgroundColor: `${color}22`,
                                color,
                              }}
                            >
                              {t.status.replace(/_/g, " ")}
                            </span>
                            {t.aprovador_nome && (
                              <span className="text-[10px] text-muted-foreground">
                                por {t.aprovador_nome}
                              </span>
                            )}
                          </div>
                          {t.gaps_identificados && (
                            <p className="mt-1 text-xs text-red-700">
                              <strong>Gaps:</strong> {t.gaps_identificados}
                            </p>
                          )}
                          {t.observacoes && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t.observacoes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-xl font-bold">{value}</div>
        <div className="mt-1 text-[10px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
