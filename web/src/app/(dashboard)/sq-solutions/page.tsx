"use client";

import { Cpu, Shield, Factory, Sparkles, Eye, Boxes } from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";
import { ValueProp } from "@/components/value-prop";

export default function SQSolutionsPage() {
  return (
    <div className="space-y-8">
      <ModuleHero
        icon={Cpu}
        badge="SQ Solutions"
        title="Soluções digitais com IA para mineração"
        description="Demonstrações práticas da capacidade Summo em IA aplicada a operações minerárias — segurança ocupacional e mineradora modelo."
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

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Por que SQ Solutions</h2>
        <p className="text-sm text-muted-foreground mb-5">Três diferenciais das soluções Summo Solutions.</p>
        <div className="grid md:grid-cols-3 gap-3">
          <ValueProp
            icon={Sparkles}
            title="IA aplicada ao real"
            description="Não é tecnologia por tecnologia — todos os modelos são treinados sobre problemas concretos da operação minerária."
            color="orange"
          />
          <ValueProp
            icon={Eye}
            title="Demos verificáveis"
            description="Toda demo abre dados, premissas e raciocínio. Você entende como o resultado foi produzido."
            color="gold"
          />
          <ValueProp
            icon={Boxes}
            title="Customizável a cada cliente"
            description="As demonstrações são templates — adaptamos aos dados reais e contextos específicos do cliente em projetos."
            color="teal"
          />
        </div>
      </section>
    </div>
  );
}
