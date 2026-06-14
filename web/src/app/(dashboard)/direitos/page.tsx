"use client";

import {
  Map,
  FileSearch,
  TrendingUp,
  Layers,
  Compass,
  ShieldAlert,
  Crosshair,
  Route,
  Building2,
  CalendarClock,
} from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";
import { ValueProp } from "@/components/value-prop";
import { RoleGate } from "@/components/role-gate";

export default function DireitosPage() {
  return (
    <div className="space-y-8">
      <ModuleHero
        icon={Map}
        badge="Ativos Minerários"
        title="Do direito minerário ao ativo operacional"
        description="A coluna vertebral do sistema: cada direito ANM como um ativo com ciclo de vida — da geologia à lavra. Mapa multi-camadas, prospecção por teses e, em breve, a trilha completa do ativo."
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

      <RoleGate minRole="consultor">
        <section>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-heading text-lg font-semibold">Ferramentas internas</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded">
              Consultor Summo
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Prospecção dirigida por teses configuráveis sobre a base de direitos.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <BigActionCard
              icon={Crosshair}
              title="Mapeamentos"
              description="Crie teses de busca (pequenos DMs para PF, ativos para investidor, projeto interno). O sistema varre a base, ranqueia oportunidades e alimenta o Funil."
              href="/mapeamentos"
              color="navy"
              badge="Interno"
            />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-heading text-lg font-semibold">Trilha do Ativo</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded">
              Novo
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Cada direito tratado como um ativo com ciclo de vida. Clique em qualquer polígono no mapa
            para abrir a trilha; ou consulte o portfólio inteiro de um titular por CNPJ.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <BigActionCard
              icon={Route}
              title="Trilha do ciclo de vida"
              description="No mapa, clique num polígono → abre a trilha: requerimento → pesquisa → RFP → lavra → operação, com os prazos legais de cada etapa."
              href="/mapa"
              color="navy"
              badge="No mapa"
            />
            <BigActionCard
              icon={Building2}
              title="Portfólio por titular (CNPJ)"
              description="Agrupa todos os direitos de um mesmo titular — quem concentra ativos, em que fases e substâncias. 22 mil titulares têm mais de um direito."
              href="/direitos/portfolio"
              color="navy"
              badge="Premium"
            />
            <BigActionCard
              icon={CalendarClock}
              title="Radar de prazos ANM"
              description="Contagem regressiva de caducidades e vencimentos sobre cada ativo. A regra já aparece na trilha; o countdown exato depende da ingestão das datas-âncora."
              href="/direitos"
              color="navy"
              comingSoon
            />
          </div>
        </section>
      </RoleGate>

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Por que Ativos Minerários Summo</h2>
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
