"use client";

import { AlertTriangle, Briefcase, ShieldAlert, Flame } from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";
import { Card, CardContent } from "@/components/ui/card";

export default function RiscosPage() {
  return (
    <div className="space-y-8">
      <ModuleHero
        icon={AlertTriangle}
        badge="Riscos & Crises"
        title="Gestão de riscos e resposta a crises"
        description="ERM Corporativo, Riscos de Projeto (ISO 31000) e Gestão de Crises — todos operam por cliente/projeto. Importe matrizes existentes ou crie do zero."
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
            description="COSO ERM — taxonomia de riscos, BSC, 3 linhas de defesa, snapshots para conselho. Para empresas com governança corporativa."
            href="/riscos-corporativos"
            color="navy"
            badge="ERM"
          />
          <BigActionCard
            icon={ShieldAlert}
            title="Riscos de Projeto"
            description="ISO 31000 aplicada a ativos específicos — bowtie, KRIs, controles, apetite a risco, plano de ações."
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

      <Card>
        <CardContent className="p-6 space-y-2">
          <h3 className="font-heading text-base font-bold">Como usar</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Todos os módulos permitem <strong>criar projetos novos do zero</strong> ou
            <strong> importar dados de exemplo</strong> para testar. Quando o cliente
            tem uma matriz de riscos em XLSX, basta fazer upload e o sistema organiza.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
