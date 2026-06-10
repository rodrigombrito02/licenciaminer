"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { BowtieForm } from "@/components/riscos/bowtie-form";
import { BowtieXPCanvas } from "@/components/riscos/bowtie-xp-canvas";
import { ClassificacaoBadge } from "@/components/riscos/classificacao-badge";
import {
  adicionarBarreiraCorretiva,
  adicionarBarreiraPreventiva,
  adicionarCausa,
  adicionarConsequencia,
  atualizarBarreiraCorretiva,
  atualizarBarreiraPreventiva,
  atualizarBowtie,
  atualizarCausa,
  atualizarConsequencia,
  criarBowtie,
  excluirBarreiraCorretiva,
  excluirBarreiraPreventiva,
  excluirCausa,
  excluirConsequencia,
  fetchAcoes,
  fetchAlertasRisco,
  fetchBowtiePorRisco,
  fetchRisco,
  type AlertasRisco,
  type Bowtie,
  type Risco,
} from "@/lib/riscos-api";

export default function BowtiePage({
  params,
}: {
  params: Promise<{ riscoId: string }>;
}) {
  const { riscoId: idStr } = use(params);
  const riscoId = Number(idStr);

  const [risco, setRisco] = useState<Risco | null>(null);
  const [bowtie, setBowtie] = useState<Bowtie | null>(null);
  const [notExists, setNotExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tradicional" | "xp">("tradicional");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acoesPrev, setAcoesPrev] = useState(0);
  const [acoesCorr, setAcoesCorr] = useState(0);
  const [alertas, setAlertas] = useState<AlertasRisco | null>(null);

  const reload = useCallback(async () => {
    const [state, acoes, alertasRisco] = await Promise.all([
      fetchBowtiePorRisco(riscoId),
      fetchAcoes({ risco_id: riscoId }),
      fetchAlertasRisco(riscoId),
    ]);
    setAcoesPrev(acoes.filter((a) => a.tipo === "preventiva").length);
    setAcoesCorr(acoes.filter((a) => a.tipo === "corretiva").length);
    setAlertas(alertasRisco);
    if (state.exists) {
      setBowtie({
        id: state.id,
        risco_id: state.risco_id,
        versao: state.versao,
        top_event: state.top_event,
        hazard: state.hazard,
        canvas_json: state.canvas_json,
        frequencia_pura: state.frequencia_pura,
        frequencia_residual: state.frequencia_residual,
        causas: state.causas,
        consequencias: state.consequencias,
        fatores: state.fatores,
        created_at: state.created_at,
        updated_at: state.updated_at,
      });
      setNotExists(false);
    } else {
      setBowtie(null);
      setNotExists(true);
    }
  }, [riscoId]);

  useEffect(() => {
    (async () => {
      const [r] = await Promise.all([fetchRisco(riscoId), reload()]);
      setRisco(r);
      setLoading(false);
    })();
  }, [riscoId, reload]);

  const wrap = async <T,>(fn: () => Promise<T>): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando bowtie…</p>;
  if (!risco) return <p className="text-sm text-destructive">Risco não encontrado.</p>;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">
            <Link href="/gestao-riscos/riscos" className="hover:underline">
              Riscos
            </Link>{" "}
            /{" "}
            <Link
              href={`/gestao-riscos/riscos/${risco.id}`}
              className="font-mono hover:underline"
            >
              {risco.codigo}
            </Link>{" "}
            / Bowtie
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{risco.nome}</h1>
          <div className="mt-1 flex items-center gap-2">
            <ClassificacaoBadge value={risco.classificacao_residual} />
            <span className="text-xs text-muted-foreground">
              P×I puro: {risco.prob_pura ?? "—"} × {risco.impacto_pura ?? "—"} •
              residual: {risco.prob_residual ?? "—"} × {risco.impacto_residual ?? "—"}
            </span>
            {saving && <span className="text-xs text-muted-foreground">salvando…</span>}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            window.open(
              `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/riscos/bowties/${riscoId}/exportar-excel`,
              "_blank",
            );
          }}
        >
          ⬇ Exportar Excel
        </Button>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {alertas &&
        (alertas.causas_criticas_sem_tratamento.length > 0 ||
          alertas.consequencias_criticas_sem_tratamento.length > 0) && (
          <Card className="border-red-500/60 bg-red-500/5">
            <CardContent className="py-3">
              <div className="text-xs font-semibold uppercase text-red-700">
                ⚠ Alerta de criticidade
              </div>
              {alertas.causas_criticas_sem_tratamento.length > 0 && (
                <p className="mt-1 text-sm">
                  {alertas.causas_criticas_sem_tratamento.length} causa(s) crítica(s)
                  sem controle preventivo nem ação:{" "}
                  {alertas.causas_criticas_sem_tratamento
                    .map((c) => c.codigo)
                    .join(", ")}
                </p>
              )}
              {alertas.consequencias_criticas_sem_tratamento.length > 0 && (
                <p className="mt-1 text-sm">
                  {alertas.consequencias_criticas_sem_tratamento.length} consequência(s)
                  crítica(s) sem controle corretivo nem ação:{" "}
                  {alertas.consequencias_criticas_sem_tratamento
                    .map((c) => c.codigo)
                    .join(", ")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {notExists ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Este risco ainda não tem bowtie.
            </p>
            <Button
              onClick={() =>
                wrap(async () => {
                  const b = await criarBowtie(riscoId, {
                    top_event: risco.nome,
                    frequencia_pura: risco.prob_pura,
                    frequencia_residual: risco.prob_residual,
                  });
                  setBowtie({ ...b });
                  setNotExists(false);
                })
              }
            >
              Criar bowtie
            </Button>
          </CardContent>
        </Card>
      ) : bowtie ? (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="tradicional">Tradicional (Excel-like)</TabsTrigger>
            <TabsTrigger value="xp">Bowtie XP (canvas)</TabsTrigger>
          </TabsList>
          <TabsContent value="tradicional" className="space-y-3">
            <BowtieForm
              bowtie={bowtie}
              onUpdateBowtie={(patch) => wrap(() => atualizarBowtie(bowtie.id, patch))}
              onAddCausa={() =>
                wrap(() =>
                  adicionarCausa(bowtie.id, { descricao: "Nova causa" }),
                )
              }
              onUpdateCausa={(causaId, patch) =>
                wrap(() => atualizarCausa(causaId, { descricao: "", ...patch }))
              }
              onDeleteCausa={(causaId) => wrap(() => excluirCausa(causaId))}
              onAddBarreiraPrev={(causaId) =>
                wrap(() =>
                  adicionarBarreiraPreventiva(causaId, { descricao: "Nova barreira" }),
                )
              }
              onUpdateBarreiraPrev={(id, patch) =>
                wrap(() =>
                  atualizarBarreiraPreventiva(id, { descricao: "", ...patch }),
                )
              }
              onDeleteBarreiraPrev={(id) => wrap(() => excluirBarreiraPreventiva(id))}
              onAddConsequencia={() =>
                wrap(() =>
                  adicionarConsequencia(bowtie.id, { descricao: "Nova consequência" }),
                )
              }
              onUpdateConsequencia={(id, patch) =>
                wrap(() => atualizarConsequencia(id, { descricao: "", ...patch }))
              }
              onDeleteConsequencia={(id) => wrap(() => excluirConsequencia(id))}
              onAddBarreiraCorr={(consequenciaId) =>
                wrap(() =>
                  adicionarBarreiraCorretiva(consequenciaId, {
                    descricao: "Nova barreira",
                  }),
                )
              }
              onUpdateBarreiraCorr={(id, patch) =>
                wrap(() =>
                  atualizarBarreiraCorretiva(id, { descricao: "", ...patch }),
                )
              }
              onDeleteBarreiraCorr={(id) => wrap(() => excluirBarreiraCorretiva(id))}
              acoesPreventivasCount={acoesPrev}
              acoesCorretivasCount={acoesCorr}
            />
          </TabsContent>
          <TabsContent value="xp">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bowtie XP — Fluxograma interativo</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Layout gerado automaticamente. Nós em vermelho = causa/consequência
                  crítica. Se crítica sem controle nem ação → badge de alerta.
                </p>
              </CardHeader>
              <CardContent className="p-2">
                <BowtieXPCanvas
                  bowtie={bowtie}
                  acoesPreventivasCount={acoesPrev}
                  acoesCorretivasCount={acoesCorr}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
