"use client";

import {
  Workflow,
  ListTodo,
  FolderOpen,
  AlertTriangle,
  MessageSquare,
  Target,
} from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";
import { Card, CardContent } from "@/components/ui/card";
import { useRole } from "@/hooks/use-role";

export default function FerramentasInternasPage() {
  const state = useRole();
  const isAdmin = state.status === "authenticated" && state.role === "admin";

  return (
    <div className="space-y-8">
      <ModuleHero
        icon={Workflow}
        badge="Ferramentas Internas"
        title="Cockpit operacional Summo"
        description="Ferramentas que apoiam o trabalho do consultor em projetos de cliente — gestão de tarefas, projetos, riscos, crises, comunicações e oportunidades."
        variant="orange"
      />

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Ferramentas disponíveis</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Cada ferramenta opera com base em <strong>Cliente → Projeto/Caso → Itens</strong>.
          Você pode criar quantos clientes e projetos quiser, e importar planos, riscos
          ou comunicações de arquivos XLSX.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <BigActionCard
            icon={ListTodo}
            title="Plano de Ações"
            description="Importe planos heterogêneos (XLSX) e veja Gantt, EAP, drill-down e cockpit multi-plano. Para qualquer cliente."
            href="/planos-de-acao"
            color="teal"
            badge="Operacional"
          />
          <BigActionCard
            icon={FolderOpen}
            title="Projetos (PM Suite)"
            description="Gestão de projetos da consultoria — Charter, WBS, CRs e Decisões. Padrão PMBoK."
            href="/projetos"
            color="teal"
            badge="Operacional"
          />
          <BigActionCard
            icon={AlertTriangle}
            title="Riscos"
            description="ERM Corporativo (COSO) + Riscos de Projeto (ISO 31000) + Bowtie + KRIs + Apetite. Multi-cliente."
            href="/riscos"
            color="orange"
            badge="Operacional"
          />
          <BigActionCard
            icon={AlertTriangle}
            title="Gestão de Crises"
            description="Cenários, comitês, simulados e BCP. Resposta estruturada a crise por cliente/projeto."
            href="/gestao-crises"
            color="orange"
            badge="Operacional"
          />
          <BigActionCard
            icon={MessageSquare}
            title="Comunicações"
            description="Stakeholders, templates de comunicação, matriz RACI e envios. Apoia gestão de partes interessadas."
            href="/comunicacoes"
            color="teal"
            badge="Operacional"
          />
          {isAdmin && (
            <BigActionCard
              icon={Target}
              title="Funil de Oportunidades"
              description="Prospecção, avaliação multi-parâmetro e relatórios de viabilidade de direitos minerários. (Sócios)"
              href="/oportunidades"
              color="gold"
              badge="Admin"
            />
          )}
        </div>
      </section>

      {/* Princípio comum */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-heading text-base font-bold">Como usar</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Todas as ferramentas seguem o mesmo padrão:
          </p>
          <ol className="text-sm space-y-2 pl-5 list-decimal text-muted-foreground">
            <li><strong>Crie um cliente</strong> (ex: Vale, CSN, ou um cliente fictício de teste).</li>
            <li><strong>Crie um projeto/caso</strong> dentro do cliente.</li>
            <li>
              <strong>Importe arquivos XLSX</strong> existentes do cliente
              (planos de ação, matriz de riscos, etc.) — o sistema lê e organiza
              automaticamente.
            </li>
            <li>
              <strong>Use o cockpit</strong>: dashboards adaptativos, alertas,
              gantt, EAP, kanban, filtros dinâmicos.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
