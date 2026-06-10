"use client";

import { Cpu, Shield, Factory } from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";

export default function SQSolutionsPage() {
  return (
    <div className="space-y-8">
      <ModuleHero
        icon={Cpu}
        badge="SQ Solutions"
        title="Soluções digitais com IA para mineração"
        description="Demonstrações práticas da capacidade da Summo em IA aplicada a operações minerárias. Segurança ocupacional e mineradora modelo."
        variant="orange"
      />

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Soluções disponíveis</h2>
        <p className="text-sm text-muted-foreground mb-5">Demos das nossas capacidades técnicas.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <BigActionCard
            icon={Shield}
            title="Segurança Ocupacional"
            description="Indicadores SST, taxas de acidente comparadas, conformidade com NRs aplicáveis à mineração."
            href="/seguranca"
            color="orange"
            badge="Demo"
          />
          <BigActionCard
            icon={Factory}
            title="Mineradora Modelo (IA)"
            description="Showcase de IA aplicada — simulador de operação minerária com dados fictícios. Demonstra capacidade analítica."
            href="/mineradora-modelo"
            color="orange"
            badge="Demo"
          />
        </div>
      </section>
    </div>
  );
}
