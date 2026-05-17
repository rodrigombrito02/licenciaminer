"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paApi, type PaPlano, type PaTarefa } from "@/lib/api";

export default function PlanoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const planoId = Number(id);
  const [plano, setPlano] = useState<PaPlano | null>(null);
  const [tarefas, setTarefas] = useState<PaTarefa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, ts] = await Promise.all([
          paApi.detalhePlano(planoId),
          paApi.tarefasDoPlano(planoId),
        ]);
        setPlano(p);
        setTarefas(ts);
      } finally {
        setLoading(false);
      }
    })();
  }, [planoId]);

  if (loading) return (
    <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-teal" /></div>
  );
  if (!plano) return <div className="p-6">Plano não encontrado</div>;

  const statusCounts: Record<string, number> = {};
  tarefas.forEach(t => {
    const k = (t.status || "sem status").toLowerCase();
    statusCounts[k] = (statusCounts[k] || 0) + 1;
  });

  const responsaveis: Record<string, number> = {};
  tarefas.forEach(t => {
    if (t.responsavel_pessoa) responsaveis[t.responsavel_pessoa] = (responsaveis[t.responsavel_pessoa] || 0) + 1;
  });

  const areas: Record<string, number> = {};
  tarefas.forEach(t => {
    if (t.area_responsavel) areas[t.area_responsavel] = (areas[t.area_responsavel] || 0) + 1;
  });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/planos-de-acao" className="text-brand-teal hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <FileSpreadsheet className="h-6 w-6 text-brand-teal flex-shrink-0 mt-1" />
        <div>
          <h1 className="font-heading text-2xl font-bold">{plano.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {plano.arquivo_origem && `${plano.arquivo_origem} · `}
            {plano.n_tarefas} tarefas · versão {plano.versao}
          </p>
        </div>
      </div>

      <Badge variant="outline" className="text-xs">
        Sprint 3 entregará dashboards adaptativos (gantt, S-curve, drill-down). Sprint 1 mostra dados crus.
      </Badge>

      {/* Resumo simples (gauges/gantt na Sessão C) */}
      <div className="grid md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por Status</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {Object.entries(statusCounts).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
              <div key={k} className="flex justify-between"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por Responsável</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {Object.entries(responsaveis).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v]) => (
              <div key={k} className="flex justify-between"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por Área</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {Object.entries(areas).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
              <div key={k} className="flex justify-between"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tabela completa */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Tarefas</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="text-left p-2">EAP</th>
                <th className="text-left p-2">Descrição</th>
                <th className="text-left p-2">Início</th>
                <th className="text-left p-2">Fim</th>
                <th className="text-left p-2">Responsável</th>
                <th className="text-left p-2">Área</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">%</th>
              </tr>
            </thead>
            <tbody>
              {tarefas.map(t => (
                <tr key={t.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-mono">{t.eap_codigo || "-"}</td>
                  <td className="p-2" style={{ paddingLeft: `${8 + (t.eap_nivel || 1 - 1) * 12}px` }}>{t.descricao}</td>
                  <td className="p-2">{t.data_inicio || "-"}</td>
                  <td className="p-2">{t.data_fim || "-"}</td>
                  <td className="p-2">{t.responsavel_pessoa || "-"}</td>
                  <td className="p-2">{t.area_responsavel || "-"}</td>
                  <td className="p-2">{t.status || "-"}</td>
                  <td className="p-2 text-right">{t.pct_concluido != null ? `${t.pct_concluido}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
