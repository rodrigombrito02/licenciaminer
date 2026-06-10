"use client";

import {
  Workflow,
  ListTodo,
  FolderOpen,
  AlertTriangle,
  MessageSquare,
  Target,
  Upload,
  Layers,
  Repeat,
} from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";
import { ValueProp } from "@/components/value-prop";
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
        description="Ferramentas que apoiam o trabalho da consultoria em projetos de cliente — tarefas, projetos, riscos, crises, comunicações e oportunidades."
        variant="orange"
      />

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Ferramentas disponíveis</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Cada ferramenta opera por <strong>Cliente → Projeto/Caso → Itens</strong>.
          Crie quantos clientes e projetos quiser, ou importe dados existentes.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <BigActionCard
            icon={ListTodo}
            title="Plano de Ações"
            description="Importe planos (XLSX) e veja Gantt, EAP, drill-down e cockpit multi-plano. Para qualquer cliente."
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
            description="ERM Corporativo + Riscos de Projeto + Bowtie + KRIs + Apetite. Multi-cliente."
            href="/riscos"
            color="orange"
            badge="Operacional"
          />
          <BigActionCard
            icon={AlertTriangle}
            title="Gestão de Crises"
            description="Cenários, comitês, simulados e BCP. Resposta estruturada por cliente/projeto."
            href="/gestao-crises"
            color="orange"
            badge="Operacional"
          />
          <BigActionCard
            icon={MessageSquare}
            title="Comunicações"
            description="Stakeholders, templates, matriz RACI e envios. Apoia gestão de partes interessadas."
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

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Por que as Ferramentas Internas Summo</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Três diferenciais que tornam o trabalho do consultor mais produtivo.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <ValueProp
            icon={Upload}
            title="Import flexível"
            description="Suba planos XLSX, XER, CSV no formato que o cliente já usa. O sistema lê e organiza — sem padronização forçada."
            color="teal"
          />
          <ValueProp
            icon={Layers}
            title="Multi-cliente isolado"
            description="Cada cliente tem seu universo de projetos, riscos e tarefas. Sem cruzamento indesejado entre clientes."
            color="gold"
          />
          <ValueProp
            icon={Repeat}
            title="Templates reutilizáveis"
            description="Estruturas que funcionaram em um projeto viram template para o próximo cliente. O conhecimento Summo se acumula."
            color="orange"
          />
        </div>
      </section>
    </div>
  );
}
