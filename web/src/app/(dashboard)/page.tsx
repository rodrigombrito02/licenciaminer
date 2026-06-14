"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Layers,
  Map,
  TrendingUp,
  Cpu,
  Lock,
  Workflow,
  ListTodo,
  AlertTriangle,
  FolderOpen,
  Search,
  FileSpreadsheet,
  Globe,
  Users,
  Target,
  CheckCircle2,
  LayoutGrid,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffectiveRole as useRole } from "@/hooks/use-effective-role";
import { ROLE_LABEL } from "@/lib/roles";
import { MinhasAcoes } from "@/components/minhas-acoes";
import { MktHero, StatBand, MktSection, FeatureCard, CTABand } from "@/components/marketing-ui";
import { Briefcase } from "lucide-react";

export default function HomePage() {
  const roleState = useRole();

  if (roleState.status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-brand-teal border-t-transparent animate-spin" />
      </div>
    );
  }

  // Visitante anonimo → vitrine
  if (roleState.status === "anonymous") {
    return <VitrineHome />;
  }

  // Logado: 3 layouts
  const { role, nome } = roleState;
  if (role === "admin") return <AdminHome nome={nome} />;
  if (role === "consultor") return <ConsultorHome nome={nome} userId={roleState.userId} />;
  return <VitrineHome nome={nome} role={role} />;
}

/* ══════════════════════════════════════════════════════════════════
   1. Vitrine — visitante anonimo + visitante pago/free logado
   ══════════════════════════════════════════════════════════════════ */

function VitrineHome({ nome, role }: { nome?: string; role?: string } = {}) {
  return (
    <div className="space-y-12">
      <MktHero
        eyebrow="Inteligência Mineral · Summo Quartile"
        title={<>Dado público vira <span className="text-brand-gold">decisão</span> na mineração.</>}
        subtitle="Da prospecção de direitos à due diligence ambiental, da inteligência de mercado à segurança operacional — uma plataforma que integra as frentes da Summo, sustentada por dados auditáveis e décadas de experiência sênior."
        cor="navy"
        ctaLabel="Falar com a Summo"
        secondaryLabel="Ver o mapa mineral"
        secondaryHref="/mapa"
      />

      <StatBand stats={[
        { value: "303 mil", label: "processos minerários (ANM · Brasil)" },
        { value: "R$ 3,5 bi", label: "CFEM monitorada (2025)" },
        { value: "31", label: "grandes projetos no radar (US$ 9,3 bi)" },
        { value: "36 mil", label: "ocorrências minerais (SGB)" },
      ]} />

      <MktSection titulo="Cinco frentes, uma Summo" sub="Cada uma resolve uma dor real do setor — e conversam entre si pela mesma base.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={ShieldCheck} cor="teal" href="/ambiental" titulo="SQ Ambiental"
            descricao="Conformidade e viabilidade de licenciamento, com a Diligência Summo."
            bullets={["Radar de condicionantes (ambiental + ANM)", "Índice de sucesso do processo", "Due Diligence em fases"]} />
          <FeatureCard icon={Map} cor="teal" href="/direitos" titulo="Ativos Minerários"
            descricao="Do direito ANM ao ativo operacional: mapa, trilha e prospecção por teses."
            bullets={["Mapa multi-camadas (energia, água, logística, geologia)", "Trilha do ciclo de vida + prazos ANM", "Portfólio por titular (CNPJ)"]} />
          <FeatureCard icon={TrendingUp} cor="gold" href="/inteligencia-comercial" titulo="Mineral Intelligence"
            descricao="Inteligência de mercado e produtos de dado que ninguém entrega no grão brasileiro."
            bullets={["Monitor CFEM e preços", "Radar de minerais estratégicos", "Pipeline de grandes projetos"]} />
          <FeatureCard icon={Briefcase} cor="navy" href="/sq-consultoria" titulo="SQ Consultoria"
            descricao="A inteligência sênior aplicada à gestão, com a Régua de Excelência."
            bullets={["Diagnóstico vs. mineradora modelo", "Riscos, crises e projetos", "Governança corporativa"]} />
          <FeatureCard icon={Cpu} cor="orange" href="/sq-solutions" titulo="SQ Soluções"
            descricao="Integradora de Saúde e Segurança (SST) com Customer Success."
            bullets={["Antifadiga e estresse térmico", "Inspeção robótica", "Segurança homem×máquina"]} />
          <FeatureCard icon={Search} cor="gold" href="/mapa" titulo="Mapa Mineral do Brasil"
            descricao="Explore os direitos minerários e cruze com camadas ambientais e de infraestrutura."
            bullets={["Polígonos ANM clicáveis", "Camadas de UC, TI, energia e logística", "Aberto para explorar"]} />
        </div>
      </MktSection>

      <MktSection titulo="Por que a Summo" sub="Não é dado por dado — é dado que vira decisão.">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard icon={Layers} cor="teal" titulo="Dados auditáveis"
            descricao="Cada número rastreável a fontes públicas oficiais (ANM, SEMAD, SGB, BCB, Comex). Sem caixa-preta." />
          <FeatureCard icon={Briefcase} cor="navy" titulo="Senioridade que assina"
            descricao="Décadas de experiência no setor mineral por trás de cada análise — não é só software." />
          <FeatureCard icon={CheckCircle2} cor="gold" titulo="Frentes integradas"
            descricao="O mesmo ativo que diagnosticamos é o que precificamos e levamos ao investidor." />
        </div>
      </MktSection>

      <CTABand
        titulo="Quer aprofundar?"
        sub="Consultoria estratégica em mineração e metalurgia, com sócios que somam décadas no setor. Fale com a nossa equipe."
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   2. Consultor — cockpit operacional pessoal
   ══════════════════════════════════════════════════════════════════ */

function ConsultorHome({ nome }: { nome: string; userId: string }) {
  return (
    <div className="space-y-6">
      {/* Hero consultor */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-teal to-brand-navy p-7 text-white">
        <p className="text-xs uppercase tracking-widest text-brand-gold mb-1">
          Cockpit do Consultor
        </p>
        <h1 className="font-heading text-3xl font-bold">Olá, {nome.split(" ")[0]}</h1>
        <p className="text-sm text-white/70 mt-2">
          Seus projetos, tarefas e ferramentas para o dia.
        </p>
      </section>

      {/* Minhas ações (agregado de todos os módulos) */}
      <MinhasAcoes nome={nome} />

      {/* Atalhos + produtos (compartilhado com o admin) */}
      <ConsultorCockpit />
    </div>
  );
}

/** Atalhos do consultor (ferramentas + produtos + estrutura do sistema).
 *  Sem hero e sem "Minhas ações" — reaproveitado por ConsultorHome e AdminHome. */
function ConsultorCockpit() {
  return (
    <>
      {/* Estrutura do sistema — visível a consultor e admin */}
      <EstruturaSistemaCard />

      {/* Atalhos ferramentas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Workflow className="h-4 w-4 text-brand-teal" />
            Suas ferramentas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <ToolLink href="/planos-de-acao" icon={ListTodo} title="Plano de Ações" desc="Upload e cockpit de planos" />
            <ToolLink href="/projetos" icon={FolderOpen} title="Projetos" desc="PM Suite" />
            <ToolLink href="/gestao-riscos" icon={AlertTriangle} title="Riscos de Projeto" desc="Bowtie + KRIs" />
            <ToolLink href="/riscos-corporativos" icon={Target} title="Riscos Corporativos" desc="ERM COSO" />
            <ToolLink href="/gestao-crises" icon={AlertTriangle} title="Crises" desc="Cenários + BCP" />
            <ToolLink href="/comunicacoes" icon={Users} title="Comunicações" desc="Stakeholders" />
          </div>
        </CardContent>
      </Card>

      {/* Produtos da Summo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-teal" />
            Produtos para clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <ToolLink href="/ambiental" icon={ShieldCheck} title="SQ Ambiental" desc="DD, viabilidade, pilhas" />
            <ToolLink href="/direitos" icon={Map} title="Ativos Minerários" desc="Mapa e prospecção" />
            <ToolLink href="/inteligencia-comercial" icon={TrendingUp} title="Mineral Intelligence" desc="Mercado mineral" />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/** Banner que leva à visão geral da Evolução do Sistema (estrutura/roadmap). */
function EstruturaSistemaCard() {
  return (
    <Link href="/evolucao" className="block group">
      <Card className="border-2 border-brand-navy/25 bg-gradient-to-br from-brand-navy/5 to-brand-teal/5 transition-all hover:border-brand-navy/50 hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="rounded-xl bg-brand-navy/10 p-3 shrink-0">
            <LayoutGrid className="h-6 w-6 text-brand-navy" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading text-base font-bold group-hover:text-brand-navy transition-colors">
                Estrutura do Sistema
              </h3>
              <Badge variant="outline" className="text-[9px]">Interno</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Visão geral da evolução: módulos, funcionalidades no ar e em breve, sprints e o mapa de visibilidade por nível de acesso.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:text-brand-navy group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════
   3. Admin — cockpit + gestao
   ══════════════════════════════════════════════════════════════════ */

function AdminHome({ nome }: { nome: string }) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-brand-navy to-[#0a1a2e] p-7 text-white">
        <p className="text-xs uppercase tracking-widest text-brand-gold mb-1">
          Painel Administrador
        </p>
        <h1 className="font-heading text-3xl font-bold">Olá, {nome.split(" ")[0]}</h1>
        <p className="text-sm text-white/70 mt-2">
          Gestão da plataforma, oportunidades estratégicas e cockpit operacional.
        </p>
      </section>

      {/* Minhas ações (agregado de todos os módulos) */}
      <MinhasAcoes nome={nome} />

      {/* Acoes admin */}
      <div className="grid md:grid-cols-3 gap-3">
        <AdminCard
          icon={Target}
          title="Funil de Oportunidades"
          description="Prospecção, avaliação e relatórios de viabilidade de direitos minerários"
          href="/oportunidades"
          badge="Em construção"
          comingSoon
        />
        <AdminCard
          icon={TrendingUp}
          title="Tráfego & Conversões"
          description="Visitas, top páginas, CTAs clicados, cadastros novos"
          href="/admin"
          badge="Em construção"
          comingSoon
        />
        <AdminCard
          icon={Users}
          title="Usuários"
          description="Listagem, roles, último login, gestão de acessos"
          href="/admin/usuarios"
          badge="Em construção"
          comingSoon
        />
      </div>

      {/* Atalhos consultor (sem hero/Minhas ações duplicados) */}
      <ConsultorCockpit />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Subcomponentes
   ══════════════════════════════════════════════════════════════════ */

function ModuleCard({
  title, description, icon: Icon, href, colorClass, iconColor, badge, disabled,
}: {
  title: string; description: string; icon: React.ComponentType<{ className?: string }>;
  href: string; colorClass: string; iconColor: string; badge?: string; disabled?: boolean;
}) {
  const inner = (
    <Card className={`group border ${colorClass} h-full transition-all ${!disabled && "hover:shadow-md"}`}>
      <CardContent className="flex items-start gap-4 p-6">
        <div className="rounded-lg bg-muted p-2.5">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-semibold ${disabled ? "text-muted-foreground" : "group-hover:text-foreground"}`}>
              {title}
            </p>
            {badge && (
              <Badge variant="outline" className="text-[9px]">{badge}</Badge>
            )}
            {disabled && (
              <Badge variant="secondary" className="text-[9px]">Em breve</Badge>
            )}
          </div>
          <p className={`mt-1 text-xs leading-relaxed ${disabled ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
            {description}
          </p>
        </div>
        {!disabled && (
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/30 transition-all group-hover:text-muted-foreground/70 group-hover:translate-x-0.5" />
        )}
      </CardContent>
    </Card>
  );
  return disabled ? <div>{inner}</div> : <Link href={href}>{inner}</Link>;
}

function HighlightCard({
  icon: Icon, title, description, href,
}: {
  icon: React.ComponentType<{ className?: string }>; title: string; description: string; href: string;
}) {
  return (
    <Link href={href}>
      <Card className="group h-full hover:shadow-md transition-all border-2 hover:border-brand-teal/40">
        <CardContent className="p-5 space-y-2">
          <Icon className="h-6 w-6 text-brand-teal" />
          <h3 className="font-bold text-sm group-hover:text-brand-teal transition-colors">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          <div className="text-xs text-brand-teal flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Explorar <ArrowRight className="h-3 w-3" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function KPICard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <CardContent className="p-4">
        <div className="text-3xl font-bold font-tabular" style={{ color }}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function ToolLink({
  href, icon: Icon, title, desc,
}: {
  href: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 hover:border-brand-teal/40 transition-colors group"
    >
      <Icon className="h-4 w-4 text-brand-teal flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium group-hover:text-brand-teal">{title}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}

function AdminCard({
  icon: Icon, title, description, href, badge, comingSoon,
}: {
  icon: React.ComponentType<{ className?: string }>; title: string;
  description: string; href: string; badge?: string; comingSoon?: boolean;
}) {
  const inner = (
    <Card className={`h-full border-2 ${comingSoon ? "border-dashed border-muted-foreground/30" : "hover:border-brand-navy/40 hover:shadow-md"} transition-all group`}>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-start justify-between">
          <Icon className={`h-6 w-6 ${comingSoon ? "text-muted-foreground/60" : "text-brand-navy"}`} />
          {badge && (
            <Badge variant="outline" className="text-[9px]">{badge}</Badge>
          )}
        </div>
        <h3 className={`font-bold text-sm ${comingSoon ? "text-muted-foreground" : ""}`}>{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
  return comingSoon ? <div>{inner}</div> : <Link href={href}>{inner}</Link>;
}
