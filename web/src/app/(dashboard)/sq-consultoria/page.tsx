"use client";

import Link from "next/link";
import {
  Briefcase,
  Stethoscope,
  ShieldAlert,
  Workflow,
  Building2,
  Factory,
  ArrowRight,
  Gauge,
  Route,
} from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { ConsultoriaCarteira } from "@/components/consultoria-carteira";
import { MktHero, StatBand, MktSection, FeatureCard, CTABand } from "@/components/marketing-ui";
import { ConsultoriaVisual } from "@/components/marketing-visuals";

export default function SQConsultoriaPage() {
  return (
    <div className="space-y-12">
      <MktHero
        eyebrow="SQ Consultoria"
        icon={Briefcase}
        title={<>Inteligência sênior que vira <span className="text-brand-gold">decisão</span>.</>}
        subtitle="Inteligência sênior aplicada à gestão do setor mineral: diagnóstico contra a régua de excelência, riscos e crises, gestão estratégica de projetos e governança — metodologia consolidada operada em cockpit digital."
        cor="navy"
        visual={<ConsultoriaVisual />}
      />

      {/* Mineradora Modelo — Régua de Excelência (chamariz da consultoria) */}
      <section>
        <Link href="/mineradora-modelo" className="block group">
          <div className="relative overflow-hidden rounded-2xl border-2 border-brand-teal/30 bg-gradient-to-br from-brand-navy via-[#13283f] to-brand-teal/20 p-6 lg:p-8 transition-all hover:border-brand-teal/60">
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold/20 px-3 py-1 text-[11px] font-semibold text-brand-gold">
                  <Factory className="h-3.5 w-3.5" /> Mineradora Modelo
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Régua de Excelência</span>
              </div>
              <h2 className="font-heading text-xl lg:text-2xl font-bold text-white">
                O padrão de classe mundial por área da mina.
              </h2>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                Sete áreas da cadeia de valor com os KPIs que separam o topo da média. No diagnóstico,
                cruzamos a sua operação contra essa régua — o gap vira o plano de trabalho.
              </p>
              <div className="mt-4 flex items-center gap-4 text-xs text-white/60">
                <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4 text-brand-teal" /> Régua: o ideal</span>
                <span className="flex items-center gap-1.5"><Stethoscope className="h-4 w-4 text-brand-teal" /> Diagnóstico: onde você está</span>
                <span className="flex items-center gap-1.5"><Route className="h-4 w-4 text-brand-teal" /> Rota: como chegar</span>
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white group-hover:bg-white/20 transition-colors">
                Ver a Mineradora Modelo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </Link>
      </section>

      <StatBand stats={[
        { value: "7 áreas", label: "da cadeia de valor na Régua" },
        { value: "Diagnóstico", label: "cliente vs. modelo ideal" },
        { value: "Riscos + Projetos", label: "metodologias consolidadas (ISO 31000)" },
        { value: "Sênior", label: "experiência que assina a entrega" },
      ]} />

      <MktSection titulo="Nossas frentes" sub="Serviços de consultoria sustentados pelos motores do sistema Summo.">
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={Stethoscope}
            cor="navy"
            titulo="Diagnóstico & estratégia"
            descricao="Cruzamos sua operação contra a Mineradora Modelo (Régua), mapeamos os gaps por área e entregamos o plano de trabalho priorizado."
            href="/mineradora-modelo"
            badge="Régua"
            bullets={["Sete áreas da cadeia de valor", "Cliente vs. modelo ideal", "Gap vira plano de trabalho"]}
          />
          <FeatureCard
            icon={ShieldAlert}
            cor="navy"
            titulo="Gestão de riscos e crises"
            descricao="ERM, planos de continuidade e gestão de crises — metodologia consolidada operada em cockpit digital."
            bullets={["Framework ISO 31000", "Planos de continuidade (BCP)", "Cockpit digital rastreável"]}
          />
          <FeatureCard
            icon={Workflow}
            cor="navy"
            titulo="Gestão estratégica de projetos"
            descricao="Estruturação e acompanhamento de projetos integrados ao plano de ação."
            bullets={["EAP e cronograma", "Kanban de execução", "Ligado ao plano de ação"]}
          />
          <FeatureCard
            icon={Building2}
            cor="navy"
            titulo="Governança corporativa"
            descricao="Gestão corporativa, comunicação e estruturação de processos para mineradoras de médio porte."
            bullets={["Estruturação de processos", "Comunicação corporativa", "Foco em médio porte"]}
          />
        </div>
      </MktSection>

      <RoleGate minRole="consultor">
        <section>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-heading text-lg font-semibold">Carteira de Clientes</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded">
              Consultor Summo
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Cadastro único de cliente com N escopos (diagnóstico, riscos &amp; crises, projetos, governança),
            cada um ligado aos módulos internos que sustentam a entrega.
          </p>
          <ConsultoriaCarteira />
        </section>
      </RoleGate>

      <MktSection titulo="Por que SQ Consultoria" sub="Três diferenciais da consultoria Summo.">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={Briefcase}
            cor="navy"
            titulo="Senioridade como selo"
            descricao="Profissionais sêniores assinam cada entrega. Reputação e responsabilidade técnica, não só software."
          />
          <FeatureCard
            icon={Workflow}
            cor="teal"
            titulo="Metodologia + tecnologia"
            descricao="Frameworks consolidados (ISO 31000, BCP) operados em cockpit digital — rastreável e auditável."
          />
          <FeatureCard
            icon={Gauge}
            cor="gold"
            titulo="Foco no setor mineral"
            descricao="Toda a metodologia é calibrada para a realidade regulatória e operacional da mineração brasileira."
          />
        </div>
      </MktSection>

      <CTABand titulo="Vamos elevar a gestão da sua operação?" sub="Fale com um consultor sênior da Summo Quartile." />
    </div>
  );
}
