"use client";

import {
  AlertTriangle,
  Briefcase,
  ShieldAlert,
  Flame,
  GitBranch,
  FolderTree,
  Zap,
} from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";
import { ValueProp } from "@/components/value-prop";

export default function RiscosPage() {
  return (
    <div className="space-y-8">
      <ModuleHero
        icon={AlertTriangle}
        badge="Riscos & Crises"
        title="Gestão de riscos e resposta a crises"
        description="ERM Corporativo, Riscos de Projeto (ISO 31000) e Gestão de Crises — três frameworks complementares operando por cliente/projeto."
        variant="orange"
      />

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Três caminhos para gestão de riscos</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Cada caminho tem seu próprio framework e ferramentas dedicadas.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <BigActionCard
            icon={Briefcase}
            title="Riscos Corporativos (ERM)"
            description="COSO ERM — taxonomia, BSC, 3 linhas de defesa, snapshots para conselho. Visão estratégica do risco corporativo."
            href="/riscos-corporativos"
            color="navy"
            badge="ERM"
          />
          <BigActionCard
            icon={ShieldAlert}
            title="Riscos de Projeto"
            description="ISO 31000 aplicada a ativos — bowtie, KRIs, controles, apetite a risco, plano de ações operacional."
            href="/gestao-riscos"
            color="orange"
            badge="ISO 31000"
          />
          <BigActionCard
            icon={Flame}
            title="Gestão de Crises"
            description="Cenários, comitês, simulados, BCP. Resposta estruturada quando o risco materializa."
            href="/gestao-crises"
            color="orange"
            badge="BCP"
          />
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Por que o módulo Riscos Summo</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Três diferenciais que tornam a operação de risco mais robusta.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <ValueProp
            icon={GitBranch}
            title="Frameworks integrados"
            description="COSO ERM + ISO 31000 + BCP convivem na mesma plataforma. Sem ter que escolher um padrão e abandonar outro."
            color="navy"
          />
          <ValueProp
            icon={FolderTree}
            title="Multi-cliente"
            description="Cada cliente tem seu universo isolado. Riscos, controles, KRIs e cenários separados — sem cruzamento indesejado."
            color="orange"
          />
          <ValueProp
            icon={Zap}
            title="Import de matrizes"
            description="Suba sua matriz de riscos em XLSX e o sistema organiza. Sem ter que recriar do zero o que o cliente já tem."
            color="gold"
          />
        </div>
      </section>
    </div>
  );
}
