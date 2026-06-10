"use client";

import { Map, FileSearch, TrendingUp } from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";

export default function DireitosPage() {
  return (
    <div className="space-y-8">
      <ModuleHero
        icon={Map}
        badge="Direitos e Concessões"
        title="Mapeamento e prospecção de direitos minerários"
        description="Visão completa do regime mineiro brasileiro a partir da ANM SCM/SIGMINE. Mapa interativo, prospecção de oportunidades e cruzamento espacial com UCs, TIs e biomas."
        variant="teal"
      />

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">O que você quer fazer?</h2>
        <p className="text-sm text-muted-foreground mb-5">Três caminhos disponíveis.</p>
        <div className="grid md:grid-cols-3 gap-4">
          <BigActionCard
            icon={Map}
            title="Mapa Geoespacial"
            description="Visualização interativa dos polígonos minerários com camadas de UCs, TIs, biomas e municípios."
            href="/mapa"
            color="teal"
          />
          <BigActionCard
            icon={FileSearch}
            title="Concessões"
            description="Lista filtrável de processos ANM por estado, substância, fase e titular. Exportação CSV."
            href="/concessoes"
            color="teal"
          />
          <BigActionCard
            icon={TrendingUp}
            title="Prospecção"
            description="Identificação de oportunidades — disponibilidades, processos arquivados, áreas com baixa sobreposição."
            href="/prospeccao"
            color="gold"
          />
        </div>
      </section>
    </div>
  );
}
