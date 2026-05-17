"use client";

import Link from "next/link";
import { ListTodo, Upload, BarChart3, Workflow, ArrowRight, FileSpreadsheet, Filter, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PlanosDeAcaoPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#1A2C42] to-[#0A2540] p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <ListTodo className="h-6 w-6 text-brand-gold" />
          <Badge variant="secondary" className="bg-brand-gold/20 text-brand-gold border-brand-gold/40">
            Em construção
          </Badge>
        </div>
        <h1 className="font-heading text-3xl font-bold mb-2">
          Plano de Ações
        </h1>
        <p className="text-sm text-white/70 max-w-2xl">
          Importe planos heterogêneos (XLSX, XER, cronogramas) e o sistema lê,
          entende e gera dashboard adaptativo. Piloto: <strong>MUSA</strong> com
          projetos estratégicos e planos avulsos.
        </p>
      </div>

      {/* Como vai funcionar */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 space-y-2">
            <Upload className="h-6 w-6 text-brand-teal" />
            <h3 className="font-bold text-base">1. Suba seus planos</h3>
            <p className="text-sm text-muted-foreground">
              XLSX, CSV, XER (Primavera). Sem padronização exigida — o sistema
              entende o formato que você usa.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-2">
            <Workflow className="h-6 w-6 text-brand-orange" />
            <h3 className="font-bold text-base">2. Organize por cliente</h3>
            <p className="text-sm text-muted-foreground">
              Cliente → Projetos Estratégicos → Planos → Tarefas. Estrutura
              flexível: monte como fizer sentido.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-2">
            <BarChart3 className="h-6 w-6 text-brand-gold" />
            <h3 className="font-bold text-base">3. Dashboard adaptativo</h3>
            <p className="text-sm text-muted-foreground">
              Gantt, S-curve, ranking de responsáveis, alertas — gerados
              automaticamente conforme os campos disponíveis.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campos canônicos */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-heading text-lg font-bold">Schema canônico</h2>
          <p className="text-sm text-muted-foreground">
            O sistema mapeia automaticamente estes campos quando reconhece. Colunas
            extras viram filtros customizados.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {[
              { label: "Data início + fim", icon: FileSpreadsheet, mandatory: true },
              { label: "Responsável (pessoa)", icon: FileSpreadsheet, mandatory: true },
              { label: "Área responsável", icon: FileSpreadsheet, mandatory: true },
              { label: "Status", icon: FileSpreadsheet, mandatory: true },
              { label: "Classificação", icon: Filter, mandatory: false },
              { label: "EAP (hierarquia)", icon: GitBranch, mandatory: false },
              { label: "Descrição", icon: FileSpreadsheet, mandatory: true },
              { label: "+ colunas customizadas", icon: Filter, mandatory: false },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm border rounded-lg p-3">
                <f.icon className={`h-4 w-4 flex-shrink-0 ${f.mandatory ? "text-brand-teal" : "text-muted-foreground"}`} />
                <span className={f.mandatory ? "font-medium" : "text-muted-foreground"}>{f.label}</span>
                {f.mandatory && <Badge variant="outline" className="ml-auto text-[10px]">obrig.</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roadmap */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-heading text-lg font-bold">Próximas entregas</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-brand-teal">●</span>
              <span><strong>Sprint 1:</strong> Upload XLSX + schema canônico + CRUD de Cliente/Projeto/Plano</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-teal">●</span>
              <span><strong>Sprint 2:</strong> Mapeamento heurístico de colunas + UI de atribuição manual</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-teal">●</span>
              <span><strong>Sprint 3:</strong> Dashboard adaptativo (gantt, S-curve, ranking, EAP)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-teal">●</span>
              <span><strong>Sprint 4:</strong> Piloto com arquivos reais da MUSA + alertas configuráveis</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-4">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-brand-teal">
          Voltar para home
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
