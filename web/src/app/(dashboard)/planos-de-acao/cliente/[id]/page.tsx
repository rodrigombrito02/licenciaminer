"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderOpen, FileSpreadsheet, Loader2, Building2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paApi } from "@/lib/api";
import {
  CockpitKPIs,
  DonutsRow,
  AlertasCard,
  RespRanking,
  type ConsolidadoAgg,
} from "@/components/planos-acao/cockpit-shared";

interface ClienteCockpit {
  cliente: { id: number; nome: string; descricao: string | null };
  n_projetos_estrategicos: number;
  n_planos: number;
  consolidado: ConsolidadoAgg;
  projetos: Array<{
    projeto_id: number; projeto_nome: string;
    n_planos: number; n_tarefas: number;
    concluidas: number; atrasadas: number;
    pct_medio: number; pct_concluidas: number;
  }>;
  planos: Array<{
    plano_id: number; plano_nome: string;
    projeto_estrategico_id: number | null;
    n_tarefas: number; concluidas: number; atrasadas: number;
    pct_medio: number; pct_concluidas: number;
    arquivo_origem: string | null; atualizado_em: string;
  }>;
}

export default function ClienteCockpitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const clienteId = Number(id);
  const [data, setData] = useState<ClienteCockpit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await paApi.cockpitCliente(clienteId);
        setData(r);
      } finally {
        setLoading(false);
      }
    })();
  }, [clienteId]);

  if (loading) return (
    <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-teal" /></div>
  );
  if (!data) return <div className="p-6">Cliente não encontrado</div>;

  const { cliente, consolidado, projetos, planos } = data;
  const planosAvulsos = planos.filter(p => !p.projeto_estrategico_id);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/planos-de-acao" className="text-brand-teal hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
      </div>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#1A2C42] to-[#0A2540] p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-6 w-6 text-brand-gold" />
          <h1 className="font-heading text-2xl font-bold">Cockpit · {cliente.nome}</h1>
          <Badge className="bg-brand-gold/20 text-brand-gold border-brand-gold/40 ml-2">Multi-plano</Badge>
        </div>
        <p className="text-sm text-white/70">
          {cliente.descricao || "Visão consolidada de todos os planos do cliente"}
          {data.consolidado.prazos.data_min && data.consolidado.prazos.data_max && (
            <span className="ml-2">· período {data.consolidado.prazos.data_min} → {data.consolidado.prazos.data_max}</span>
          )}
        </p>
      </div>

      {/* KPIs consolidados */}
      <CockpitKPIs agg={consolidado} />

      {/* Alertas */}
      <AlertasCard agg={consolidado} />

      {/* Projetos estratégicos */}
      {projetos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-brand-teal" /> Projetos Estratégicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projetos.map(p => (
                <Link key={p.projeto_id} href={`/planos-de-acao/projeto/${p.projeto_id}`}>
                  <Card className="hover:border-brand-teal transition-colors cursor-pointer h-full">
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm">{p.projeto_nome}</div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.n_planos} planos · {p.n_tarefas} tarefas
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{p.pct_concluidas}% concluído</Badge>
                        {p.atrasadas > 0 && (
                          <Badge variant="destructive" className="text-[10px]">{p.atrasadas} atrasada{p.atrasadas > 1 ? "s" : ""}</Badge>
                        )}
                      </div>
                      <div className="h-1.5 bg-muted rounded overflow-hidden mt-1">
                        <div
                          className="h-full bg-brand-teal"
                          style={{ width: `${p.pct_medio}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planos avulsos */}
      {planosAvulsos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Planos avulsos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {planosAvulsos.map(p => (
                <li key={p.plano_id} className="py-2">
                  <Link href={`/planos-de-acao/${p.plano_id}`} className="flex items-center gap-2 group">
                    <FileSpreadsheet className="h-4 w-4 text-brand-teal flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium group-hover:text-brand-teal truncate">{p.plano_nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.n_tarefas} tarefas · {p.pct_concluidas}% concluído
                        {p.atrasadas > 0 && <span className="text-destructive ml-2">· {p.atrasadas} atrasadas</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-3 w-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Visualizações analíticas */}
      <DonutsRow agg={consolidado} />
      <RespRanking agg={consolidado} />
    </div>
  );
}
