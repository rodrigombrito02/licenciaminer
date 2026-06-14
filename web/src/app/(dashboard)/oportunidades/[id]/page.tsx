"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Save,
  Target,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { opApi, type Oportunidade } from "@/lib/api";

const PARAMETROS = [
  { key: "score_agua", label: "Disponibilidade de Água", icon: "💧" },
  { key: "score_energia", label: "Energia", icon: "⚡" },
  { key: "score_logistica", label: "Logística", icon: "🚛" },
  { key: "score_mao_obra", label: "Mão de obra", icon: "👷" },
  { key: "score_licenciamento", label: "Licenciamento ambiental", icon: "🛡️" },
  { key: "score_financeiro", label: "Financeiro", icon: "💰" },
  { key: "score_stakeholder", label: "Stakeholder & ESG", icon: "🌱" },
  { key: "score_geologico", label: "Potencial geológico", icon: "⛏️" },
  { key: "score_climatico", label: "Risco climático", icon: "🌧️" },
] as const;

export default function OportunidadeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const opId = Number(id);
  const [op, setOp] = useState<Oportunidade | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const d = await opApi.detalhe(opId);
      setOp(d);
      const s: Record<string, number | null> = {};
      for (const p of PARAMETROS) {
        s[p.key] = (d as unknown as Record<string, number | null>)[p.key];
      }
      setScores(s);
      setNotas(d.notas_avaliacao || {});
    } finally {
      setLoading(false);
    }
  }, [opId]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvar() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...scores, notas_avaliacao: notas };
      await opApi.atualizarAvaliacao(opId, payload as Partial<Oportunidade>);
      await carregar();
    } finally {
      setSaving(false);
    }
  }

  const [enriquecendo, setEnriquecendo] = useState(false);
  async function enriquecer() {
    setEnriquecendo(true);
    try {
      const d = await opApi.enriquecer(opId);
      setScores({
        score_agua: d.score_agua, score_energia: d.score_energia, score_logistica: d.score_logistica,
        score_mao_obra: d.score_mao_obra, score_licenciamento: d.score_licenciamento,
        score_financeiro: d.score_financeiro, score_stakeholder: d.score_stakeholder,
        score_geologico: d.score_geologico, score_climatico: d.score_climatico,
      });
      setNotas(d.notas_avaliacao || {});
    } catch (e) {
      alert("Erro ao enriquecer: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setEnriquecendo(false);
    }
  }

  async function gerarRelatorio() {
    setGenerating(true);
    try {
      await opApi.gerarRelatorio(opId);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return (
    <div className="p-8 flex justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
    </div>
  );
  if (!op) return <div className="p-6">Oportunidade não encontrada</div>;

  const consolidado = Object.values(scores).filter(s => s != null);
  const media = consolidado.length > 0
    ? (consolidado.reduce((a, b) => (a || 0) + (b || 0), 0) || 0) / consolidado.length
    : null;

  return (
    <div className="space-y-4 p-6">
      {/* Breadcrumb */}
      <Link href="/oportunidades" className="text-sm text-brand-teal hover:underline inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar para o funil
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Target className="h-6 w-6 text-brand-gold flex-shrink-0 mt-1" />
          <div>
            <h1 className="font-heading text-2xl font-bold">{op.titulo}</h1>
            <p className="text-sm text-muted-foreground">
              {op.substancia && `${op.substancia} · `}
              {op.processo_anm && `ANM ${op.processo_anm} · `}
              {op.municipio && `${op.municipio}/${op.uf || ""}`}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">Etapa: {op.etapa}</Badge>
      </div>

      {/* Score consolidado */}
      <Card className="border-2 border-brand-gold/30 bg-brand-gold/5">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Score Consolidado</p>
            <p className="font-tabular text-4xl font-bold text-brand-navy">
              {media != null ? media.toFixed(1) : "—"}
              <span className="text-lg text-muted-foreground"> / 10</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {consolidado.length} de {PARAMETROS.length} parâmetros avaliados
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={gerarRelatorio} disabled={generating} className="bg-brand-gold text-brand-navy hover:bg-brand-gold/90">
              {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
              Gerar Relatório de Viabilidade
            </Button>
            <Button variant="outline" size="sm" onClick={salvar} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Salvar avaliação
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 9 parâmetros */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base font-heading">Avaliação dos 9 parâmetros</CardTitle>
              <p className="text-xs text-muted-foreground">Pontuação de 0 a 10. O enriquecimento automático pré-preenche com base nas fontes públicas — você calibra.</p>
            </div>
            <Button size="sm" variant="outline" onClick={enriquecer} disabled={enriquecendo} className="shrink-0">
              {enriquecendo ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1 text-brand-gold" />}
              Enriquecer automaticamente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {PARAMETROS.map((p) => {
            const valor = scores[p.key];
            const cor = valor == null ? "#9CA3AF" :
              valor >= 7 ? "#27AE60" :
              valor >= 4 ? "#F39C12" : "#E74C3C";
            return (
              <div key={p.key} className="space-y-2 pb-3 border-b last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.icon}</span>
                    <h4 className="font-bold text-sm">{p.label}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={valor ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        setScores(prev => ({ ...prev, [p.key]: v }));
                      }}
                      className="w-20 text-center font-bold text-base"
                      style={{ color: cor }}
                      placeholder="—"
                    />
                    <span className="text-xs text-muted-foreground">/ 10</span>
                  </div>
                </div>
                <Input
                  value={notas[p.label] || ""}
                  onChange={(e) => setNotas(prev => ({ ...prev, [p.label]: e.target.value }))}
                  placeholder="Justificativa breve (opcional)"
                  className="text-xs"
                />
                <div className="h-1.5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full transition-all rounded"
                    style={{ width: `${(valor || 0) * 10}%`, background: cor }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Identificação do ativo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Identificação do ativo</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1 font-medium pr-3">Substância</td><td>{op.substancia || "—"}</td></tr>
              <tr><td className="py-1 font-medium pr-3">Processo ANM</td><td className="font-mono text-xs">{op.processo_anm || "—"}</td></tr>
              <tr><td className="py-1 font-medium pr-3">Fase ANM</td><td>{op.fase_anm || "—"}</td></tr>
              <tr><td className="py-1 font-medium pr-3">Área (ha)</td><td>{op.area_ha != null ? `${op.area_ha} ha` : "—"}</td></tr>
              <tr><td className="py-1 font-medium pr-3">Município / UF</td><td>{[op.municipio, op.uf].filter(Boolean).join(" / ") || "—"}</td></tr>
              <tr><td className="py-1 font-medium pr-3">Valor estimado</td><td>{op.valor_estimado ? `R$ ${(op.valor_estimado / 1e6).toFixed(2)} M` : "A definir"}</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
