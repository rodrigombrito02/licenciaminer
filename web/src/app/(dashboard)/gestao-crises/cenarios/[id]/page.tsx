"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Clock, Flame, MessageSquare, Phone, Target, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CATEGORIA_COR,
  STATUS_CENARIO_COLOR,
  fetchCenario,
  type CenarioDetalhe,
} from "@/lib/crises-api";
import {
  PAPEL_COR,
  PAPEL_LABEL,
  fetchRACI,
  fetchTemplates,
  type RACI,
  type TemplateComunicacao,
} from "@/lib/comunicacoes-api";

export default function CenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = use(params);
  const id = Number(idStr);
  const [c, setC] = useState<CenarioDetalhe | null>(null);
  const [raci, setRaci] = useState<RACI[]>([]);
  const [templates, setTemplates] = useState<TemplateComunicacao[]>([]);

  useEffect(() => {
    fetchCenario(id).then(setC);
    fetchRACI("cenario", id).then(setRaci);
    fetchTemplates({ cenario_id: id }).then(setTemplates);
  }, [id]);

  if (!c) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const catColor = CATEGORIA_COR[c.categoria ?? ""] ?? "#64748b";
  const statusColor = STATUS_CENARIO_COLOR[c.status] ?? "#64748b";
  const score = (c.severidade ?? 0) * (c.probabilidade ?? 0);

  return (
    <div className="space-y-4">
      <header>
        <div className="flex items-start justify-between">
          <div className="text-xs text-muted-foreground">
            <Link href="/gestao-crises/cenarios" className="hover:underline">
              Cenários
            </Link>{" "}
            / <span className="font-mono">{c.codigo}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              window.open(
                `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/crises/cenarios/${c.id}/exportar-pdf`,
                "_blank",
              );
            }}
            className="rounded border border-border px-3 py-1 text-xs hover:border-primary/50"
          >
            ⬇ Exportar PDF
          </button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{c.nome}</h1>
            {c.descricao && (
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{c.descricao}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className="rounded px-3 py-1 text-sm font-bold"
              style={{ backgroundColor: `${catColor}22`, color: catColor }}
            >
              {c.categoria ? c.categoria.toUpperCase() : "—"}
            </span>
            <span
              className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase"
              style={{ backgroundColor: `${statusColor}22`, color: statusColor }}
            >
              {c.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Severidade: <strong>{c.severidade ?? "—"}/5</strong></span>
          <span>Probabilidade: <strong>{c.probabilidade ?? "—"}/5</strong></span>
          <span>
            Score: <strong className="text-red-600">{score}</strong>
          </span>
          {c.comite_nome && <span>Comitê: <strong>{c.comite_nome}</strong></span>}
          {c.coordenador_nome && <span>Coordenador: <strong>{c.coordenador_nome}</strong></span>}
          {c.risco_codigo && (
            <span>
              Risco vinculado:{" "}
              <Link
                href={`/gestao-riscos/riscos/${c.risco_id}`}
                className="font-mono text-primary hover:underline"
              >
                {c.risco_codigo}
              </Link>
            </span>
          )}
        </div>
      </header>

      <Tabs defaultValue="acionamento">
        <TabsList>
          <TabsTrigger value="acionamento">
            Acionamento ({c.acionamentos.length})
          </TabsTrigger>
          <TabsTrigger value="runbook">
            Runbook ({c.runbooks.length})
          </TabsTrigger>
          <TabsTrigger value="simulados">
            Simulados ({c.simulados.length})
          </TabsTrigger>
          <TabsTrigger value="licoes">
            Lições ({c.licoes.length})
          </TabsTrigger>
          <TabsTrigger value="comunicacao">
            Comunicação ({raci.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="acionamento" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Árvore de acionamento</CardTitle>
              <p className="text-xs text-muted-foreground">
                Sequência de chamadas no momento zero do cenário. Tempos são relativos ao
                gatilho inicial.
              </p>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-3 pl-4">
                <span className="absolute left-[6px] top-2 bottom-2 w-px bg-border" />
                {c.acionamentos.map((a, idx) => (
                  <li key={a.id} className="relative">
                    <div
                      className="absolute -left-4 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-white"
                      style={{ opacity: 1 - idx * 0.1 }}
                    />
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          PASSO {a.ordem + 1}
                        </span>
                        {a.tempo_resposta_min !== null && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {a.tempo_resposta_min === 0
                              ? "imediato"
                              : `T+${a.tempo_resposta_min} min`}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 font-medium">{a.papel}</div>
                      {a.pessoa_nome && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" /> {a.pessoa_nome}
                        </div>
                      )}
                      {a.criterio && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <strong>Critério:</strong> {a.criterio}
                        </p>
                      )}
                      {a.contato && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {a.contato}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runbook" className="space-y-3 pt-3">
          {c.runbooks.map((rb) => (
            <Card key={rb.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{rb.titulo}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      versão {rb.versao}
                      {rb.data_revisao ? ` · revisão em ${rb.data_revisao}` : ""}
                      {rb.aprovador_nome ? ` · aprovado por ${rb.aprovador_nome}` : ""}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {rb.descricao && (
                  <p className="mb-3 text-sm text-muted-foreground">{rb.descricao}</p>
                )}
                <div className="space-y-2">
                  {rb.steps.map((s) => (
                    <div
                      key={s.id}
                      className="flex gap-3 rounded border border-border p-2 text-sm"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 font-bold text-primary">
                        {s.ordem + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{s.descricao}</div>
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
                          {s.recursos_necessarios && (
                            <span>📦 {s.recursos_necessarios}</span>
                          )}
                          {s.responsavel_nome && (
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3" /> {s.responsavel_nome}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {c.runbooks.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Nenhum runbook cadastrado ainda.
            </p>
          )}
        </TabsContent>

        <TabsContent value="simulados" className="space-y-2 pt-3">
          {c.simulados.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-start justify-between gap-4 py-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{s.titulo}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase">
                      {s.tipo}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        s.status === "concluido"
                          ? "bg-green-500/20 text-green-700"
                          : s.status === "planejado"
                          ? "bg-blue-500/20 text-blue-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {s.data_prevista && `Previsto: ${s.data_prevista}`}
                    {s.data_realizacao && ` · Realizado: ${s.data_realizacao}`}
                    {s.facilitador_nome && ` · Facilitador: ${s.facilitador_nome}`}
                  </div>
                  {s.objetivos && (
                    <p className="mt-1 text-xs">
                      <strong>Objetivos:</strong> {s.objetivos}
                    </p>
                  )}
                  {s.gaps_identificados && (
                    <p className="mt-1 text-xs text-red-700">
                      <strong>Gaps:</strong> {s.gaps_identificados}
                    </p>
                  )}
                </div>
                {s.nota_performance && (
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] uppercase text-muted-foreground">Nota</span>
                    <span className="text-2xl font-bold text-primary">
                      {s.nota_performance}
                    </span>
                    <span className="text-[9px] text-muted-foreground">/ 5</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {c.simulados.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Nenhum simulado cadastrado.
            </p>
          )}
        </TabsContent>

        <TabsContent value="comunicacao" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Matriz RACI de comunicação
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Quem é Responsável (R) / Aprovador (A) / Consultado (C) / Informado (I)
                em cada momento do cenário.
              </p>
            </CardHeader>
            <CardContent>
              {raci.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma matriz RACI cadastrada.
                </p>
              ) : (
                <div className="space-y-2">
                  {(["deteccao", "resolucao", "pos_evento", "continuo"] as const).map(
                    (momento) => {
                      const lista = raci.filter((r) => r.momento === momento);
                      if (lista.length === 0) return null;
                      return (
                        <div key={momento}>
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            {momento === "pos_evento"
                              ? "Pós-evento"
                              : momento === "continuo"
                              ? "Contínuo"
                              : momento}
                          </div>
                          <div className="space-y-1">
                            {lista.map((r) => {
                              const cor = PAPEL_COR[r.papel] ?? "#64748b";
                              return (
                                <div
                                  key={r.id}
                                  className="flex items-center gap-2 rounded border border-border p-2 text-xs"
                                >
                                  <span
                                    className="w-8 rounded px-1 text-center font-bold uppercase text-white"
                                    style={{ backgroundColor: cor }}
                                  >
                                    {r.papel[0]}
                                  </span>
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {r.stakeholder_nome}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {PAPEL_LABEL[r.papel]}
                                      {r.canal_preferido ? ` · ${r.canal_preferido}` : ""}
                                      {r.prazo_max_min
                                        ? ` · prazo máx ${r.prazo_max_min} min`
                                        : ""}
                                      {r.obrigatorio ? " · OBRIGATÓRIO" : " · opcional"}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {templates.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Templates associados ({templates.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {templates.map((t) => (
                  <Link
                    key={t.id}
                    href={`/comunicacoes/templates/${t.id}`}
                    className="block rounded border border-border p-2 text-sm hover:border-primary/50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.codigo}
                      </span>
                      <span className="font-medium">{t.titulo}</span>
                      {t.categoria && (
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] capitalize">
                          {t.categoria.replace("_", " ")}
                        </span>
                      )}
                      {t.canal_sugerido && (
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px]">
                          📡 {t.canal_sugerido}
                        </span>
                      )}
                    </div>
                    {t.publicos_sugeridos && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Público: {t.publicos_sugeridos}
                      </div>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="licoes" className="space-y-2 pt-3">
          {c.licoes.map((l) => (
            <Card key={l.id}>
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">{l.data}</span>
                  <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-700">
                    {l.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm">{l.descricao}</p>
                {l.melhoria_proposta && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <strong>Proposta:</strong> {l.melhoria_proposta}
                  </p>
                )}
                {l.responsavel_nome && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Responsável: {l.responsavel_nome}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          {c.licoes.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Nenhuma lição aprendida registrada.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
