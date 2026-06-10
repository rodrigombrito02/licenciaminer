"use client";

import {
  Map,
  FileSearch,
  TrendingUp,
  Layers,
  Compass,
  ShieldAlert,
} from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";
import { ValueProp } from "@/components/value-prop";

export default function DireitosPage() {
  return (
    <div className="space-y-8">
      <ModuleHero
        icon={Map}
        badge="Direitos e Concessões"
        title="Mapeamento e prospecção de direitos minerários"
        description="ANM SCM/SIGMINE em mapa interativo. Identifique áreas, cruze com UCs, TIs e biomas, prospere oportunidades."
        variant="teal"
      />

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">O que você quer fazer?</h2>
        <p className="text-sm text-muted-foreground mb-5">Três caminhos disponíveis.</p>
        <div className="grid md:grid-cols-3 gap-4">
          <BigActionCard
            icon={Map}
            title="Mapa Geoespacial"
            description="Polígonos minerários do Brasil em mapa interativo com camadas de UCs, TIs, biomas e municípios."
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
            description="Oportunidades — disponibilidades ANM, processos arquivados, áreas com baixa sobreposição ambiental."
            href="/prospeccao"
            color="gold"
          />
        </div>
      </section>

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Por que Direitos e Concessões Summo</h2>
        <p className="text-sm text-muted-foreground mb-5">Três diferenciais que tornam a análise mais robusta.</p>
        <div className="grid md:grid-cols-3 gap-3">
          <ValueProp
            icon={Layers}
            title="Cruzamento espacial automático"
            description="Cada processo ANM já vem com flag de UC/TI/bioma pré-calculado. Sem precisar abrir QGIS ou ArcGIS."
            color="teal"
          />
          <ValueProp
            icon={Compass}
            title="Prospecção dirigida"
            description="Filtros pra encontrar áreas com bom potencial — substância de alto CFEM, baixa restrição ambiental, distância adequada a logística."
            color="gold"
          />
          <ValueProp
            icon={ShieldAlert}
            title="Riscos pré-mapeados"
            description="Sobreposição com áreas sensíveis sinalizada antes de você comprometer recursos com avaliação detalhada."
            color="orange"
          />
        </div>
      </section>
    </div>
  );
}
