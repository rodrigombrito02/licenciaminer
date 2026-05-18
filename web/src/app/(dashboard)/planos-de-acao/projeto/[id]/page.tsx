"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderOpen, FileSpreadsheet, Loader2, ChevronRight } from "lucide-react";
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

interface ProjetoCockpit {
  projeto: { id: number; nome: string; descricao: string | null; status: string; cliente_id: number };
  n_planos: number;
  consolidado: ConsolidadoAgg;
  planos: Array<{
    plano_id: number; plano_nome: string;
    n_tarefas: number; concluidas: number; atrasadas: number;
    pct_medio: number; pct_concluidas: number;
    arquivo_origem: string | null; atualizado_em: string;
  }>;
}

export default function ProjetoCockpitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projetoId = Number(id);
  const [data, setData] = useState<ProjetoCockpit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await paApi.cockpitProjeto(projetoId);
        setData(r);
      } finally {
        setLoading(false);
      }
    })();
  }, [projetoId]);

  if (loading) return (
    <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-teal" /></div>
  );
  if (!data) return <div className="p-6">Projeto não encontrado</div>;

  const { projeto, consolidado, planos } = data;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/planos-de-acao/cliente/${projeto.cliente_id}`} className="text-brand-teal hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Cockpit do cliente
        </Link>
      </div>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#1A2C42] to-[#0A2540] p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen className="h-6 w-6 text-brand-gold" />
          <h1 className="font-heading text-2xl font-bold">{projeto.nome}</h1>
          <Badge className="bg-brand-gold/20 text-brand-gold border-brand-gold/40 ml-2">Projeto Estratégico</Badge>
        </div>
        <p className="text-sm text-white/70">
          {projeto.descricao || "Visão consolidada dos planos do projeto"} · {data.n_planos} planos
        </p>
      </div>

      <CockpitKPIs agg={consolidado} />
      <AlertasCard agg={consolidado} />

      {/* Planos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-brand-teal" /> Planos vinculados ({planos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {planos.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhum plano vinculado a este projeto ainda. Suba um na página principal.</p>
          ) : (
            <ul className="divide-y">
              {planos.map(p => (
                <li key={p.plano_id} className="py-2">
                  <Link href={`/planos-de-acao/${p.plano_id}`} className="flex items-center gap-2 group">
                    <FileSpreadsheet className="h-4 w-4 text-brand-teal flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium group-hover:text-brand-teal truncate">{p.plano_nome}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                        <span>{p.n_tarefas} tarefas</span>
                        <span>· {p.concluidas} concluídas</span>
                        {p.atrasadas > 0 && <span className="text-destructive">· {p.atrasadas} atrasadas</span>}
                        <span>· {p.pct_concluidas}% conclusão</span>
                      </div>
                    </div>
                    <div className="w-32 h-1.5 bg-muted rounded overflow-hidden hidden sm:block">
                      <div className="h-full bg-brand-teal" style={{ width: `${p.pct_medio}%` }} />
                    </div>
                    <ChevronRight className="h-3 w-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <DonutsRow agg={consolidado} />
      <RespRanking agg={consolidado} />
    </div>
  );
}
