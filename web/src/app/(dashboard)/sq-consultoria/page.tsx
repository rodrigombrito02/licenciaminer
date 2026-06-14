"use client";

import Link from "next/link";
import {
  Briefcase,
  Stethoscope,
  ShieldAlert,
  Workflow,
  Building2,
  Target,
  Users,
  Award,
  Factory,
  ArrowRight,
  Gauge,
  Route,
} from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { BigActionCard } from "@/components/big-action-card";
import { ValueProp } from "@/components/value-prop";
import { RoleGate } from "@/components/role-gate";
import { ConsultoriaCarteira } from "@/components/consultoria-carteira";

export default function SQConsultoriaPage() {
  return (
    <div className="space-y-8">
      <ModuleHero
        icon={Briefcase}
        badge="SQ Consultoria"
        title="Consultoria estratégica para o setor mineral"
        description="A inteligência sênior da Summo Quartile aplicada à gestão: diagnóstico, riscos e crises, gestão estratégica de projetos e governança corporativa. Tecnologia a serviço da decisão."
        variant="navy"
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

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Nossas frentes</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Serviços de consultoria sustentados pelos motores do sistema Summo.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <BigActionCard
            icon={Stethoscope}
            title="Diagnóstico & estratégia"
            description="Cruzamos sua operação contra a Mineradora Modelo (Régua), mapeamos os gaps por área e entregamos o plano de trabalho priorizado."
            href="/mineradora-modelo"
            color="navy"
            badge="Régua"
          />
          <BigActionCard
            icon={ShieldAlert}
            title="Gestão de riscos e crises"
            description="ERM (ISO 31000), planos de continuidade (BCP) e gestão de crises — metodologia consolidada e cockpit digital."
            href="/sq-consultoria"
            color="navy"
            comingSoon
          />
          <BigActionCard
            icon={Workflow}
            title="Gestão estratégica de projetos"
            description="Estruturação e acompanhamento de projetos com EAP, cronograma e Kanban integrados ao plano de ação."
            href="/sq-consultoria"
            color="navy"
            comingSoon
          />
          <BigActionCard
            icon={Building2}
            title="Governança corporativa"
            description="Gestão corporativa, comunicação e estruturação de processos para mineradoras de médio porte."
            href="/sq-consultoria"
            color="navy"
            comingSoon
          />
        </div>
      </section>

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

      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Por que SQ Consultoria</h2>
        <p className="text-sm text-muted-foreground mb-5">Três diferenciais da consultoria Summo.</p>
        <div className="grid md:grid-cols-3 gap-3">
          <ValueProp
            icon={Award}
            title="Senioridade como selo"
            description="Profissionais sêniores assinam cada entrega. Reputação e responsabilidade técnica, não só software."
            color="navy"
          />
          <ValueProp
            icon={Workflow}
            title="Metodologia + tecnologia"
            description="Frameworks consolidados (ISO 31000, BCP) operados em cockpit digital — rastreável e auditável."
            color="teal"
          />
          <ValueProp
            icon={Users}
            title="Foco no setor mineral"
            description="Toda a metodologia é calibrada para a realidade regulatória e operacional da mineração brasileira."
            color="gold"
          />
        </div>
      </section>
    </div>
  );
}
