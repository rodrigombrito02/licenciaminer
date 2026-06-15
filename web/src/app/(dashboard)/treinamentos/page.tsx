"use client";

import { GraduationCap, Users, BookOpen, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { MktHero, MktSection, FeatureCard } from "@/components/marketing-ui";

export default function TreinamentosPage() {
  return (
    <div className="space-y-12">
      <MktHero
        eyebrow="Treinamentos · Em breve"
        icon={GraduationCap}
        title={<>Capacitação corporativa em <span className="text-brand-gold">mineração</span>.</>}
        subtitle="A senioridade Summo transformada em treinamento: regulatório, ambiental, segurança e operação — formação prática para times de mineração, conduzida por quem viveu o setor."
        cor="navy"
        ctaLabel="Quero saber quando lançar"
      />

      <MktSection titulo="O que vamos oferecer" sub="Programa em estruturação — frentes previstas.">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard icon={ShieldCheck} cor="teal" titulo="Regulatório & ambiental"
            descricao="Licenciamento, condicionantes, ANM e compliance — na prática do dia a dia da operação." badge="Em breve" />
          <FeatureCard icon={BookOpen} cor="gold" titulo="Operação & excelência"
            descricao="As 7 áreas da mineradora modelo: o que separa o topo da média, área por área." badge="Em breve" />
          <FeatureCard icon={Users} cor="orange" titulo="Segurança & cultura"
            descricao="SST, gestão de riscos e crises — formação para reduzir incidentes de verdade." badge="Em breve" />
        </div>
      </MktSection>

      <section className="rounded-2xl border border-dashed border-brand-navy/30 bg-brand-navy/5 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Frente em estruturação. Ponto focal: <strong className="text-brand-navy">Léo</strong>.
        </p>
        <Link href="/login" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90">
          Falar com a Summo <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
