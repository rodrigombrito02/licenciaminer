"use client";

import {
  Map,
  FileSearch,
  TrendingUp,
  Layers,
  Search,
  Building2,
  Route,
  Crosshair,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { BigActionCard } from "@/components/big-action-card";
import { RoleGate } from "@/components/role-gate";
import { MktHero, StatBand, MktSection, FeatureCard, CTABand } from "@/components/marketing-ui";

export default function DireitosPage() {
  return (
    <div className="space-y-12">
      <MktHero
        eyebrow="Ativos Minerários"
        icon={Map}
        title={<>Do direito ANM ao <span className="text-brand-gold">ativo operacional</span>.</>}
        subtitle="Cada direito minerário tratado como um ativo com ciclo de vida — da geologia à lavra. Mapa multi-camadas, prospecção por teses e a trilha completa do ativo, sobre dados públicos auditáveis."
        cor="teal"
      />

      <StatBand stats={[
        { value: "303 mil", label: "processos minerários (ANM · Brasil)" },
        { value: "22 mil", label: "titulares com mais de um direito" },
        { value: "36 mil", label: "ocorrências minerais (SGB)" },
        { value: "5 camadas", label: "no mapa (energia, água, logística, geologia)" },
      ]} />

      <MktSection titulo="O que você faz aqui" sub="Do mapa à oportunidade, três caminhos sobre a base de direitos.">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={Map}
            cor="teal"
            titulo="Mapa Geoespacial"
            href="/mapa"
            descricao="Polígonos minerários do Brasil em mapa interativo, cruzados com camadas de contexto."
            bullets={["Energia, água, logística e geologia", "UCs, TIs, biomas e municípios", "Clique no polígono para abrir a trilha"]}
          />
          <FeatureCard
            icon={FileSearch}
            cor="teal"
            titulo="Concessões"
            href="/concessoes"
            descricao="Lista filtrável de processos ANM por estado, substância, fase e titular."
            bullets={["Filtros combináveis", "Exportação CSV", "Visão por titular"]}
          />
          <FeatureCard
            icon={TrendingUp}
            cor="gold"
            titulo="Prospecção"
            href="/prospeccao"
            descricao="Oportunidades sobre a base: onde há espaço e baixa restrição."
            bullets={["Disponibilidades ANM", "Processos arquivados", "Baixa sobreposição ambiental"]}
          />
        </div>
      </MktSection>

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

      <MktSection titulo="Por que Ativos Minerários Summo" sub="Análise espacial pronta, prospecção dirigida e risco antecipado.">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={Layers}
            cor="teal"
            titulo="Cruzamento espacial automático"
            descricao="Cada processo ANM já vem com flag de UC/TI/bioma pré-calculado. Sem precisar abrir QGIS ou ArcGIS."
          />
          <FeatureCard
            icon={Search}
            cor="gold"
            titulo="Prospecção dirigida"
            descricao="Filtros para encontrar áreas com bom potencial — substância de alto CFEM, baixa restrição ambiental, distância adequada à logística."
          />
          <FeatureCard
            icon={CheckCircle2}
            cor="orange"
            titulo="Riscos pré-mapeados"
            descricao="Sobreposição com áreas sensíveis sinalizada antes de você comprometer recursos com avaliação detalhada."
          />
        </div>
      </MktSection>

      <CTABand titulo="Quer mapear um ativo minerário?" sub="Comece pelo mapa ou fale com um consultor da Summo Quartile." />
    </div>
  );
}
