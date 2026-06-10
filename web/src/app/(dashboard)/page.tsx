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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/use-role";
import { ROLE_LABEL } from "@/lib/roles";

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
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A2540] via-[#1A2C42] to-[#0A2540] px-8 py-12 lg:px-12 lg:py-16">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Image src="/logo2.png" alt="Summo Quartile" width={48} height={48} className="rounded-xl" />
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-white lg:text-3xl">
                {nome ? `Bem-vindo, ${nome.split(" ")[0]}` : "Summo Quartile"}
              </h1>
              <p className="text-sm font-medium text-brand-gold tracking-wide">
                Plataforma de Inteligência Mineral
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/70 max-w-lg">
            Análise, conformidade e oportunidades em mineração. Da prospecção
            de oportunidades à due diligence ambiental — tudo apoiado por dados
            públicos auditáveis e décadas de experiência da consultoria Summo.
          </p>
          {role && (
            <div className="mt-4">
              <Badge className="bg-brand-gold/20 text-brand-gold border-brand-gold/40">
                Seu acesso: {ROLE_LABEL[role as keyof typeof ROLE_LABEL] || role}
              </Badge>
            </div>
          )}
        </div>
      </section>

      {/* 6 caixas comerciais */}
      <section id="modulos">
        <div className="mb-5">
          <h2 className="font-heading text-lg font-semibold tracking-tight">Módulos da Plataforma</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Seis frentes integradas — clique pra explorar
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ModuleCard
            title="Summo Ambiental"
            description="Análise de dados regulatórios, viabilidade preliminar e Diligência Summo (DD ambiental + pilhas)."
            icon={ShieldCheck}
            href="/ambiental"
            colorClass="border-brand-teal/30 hover:border-brand-teal/60"
            iconColor="text-brand-teal"
          />
          <ModuleCard
            title="Direitos e Concessões"
            description="Mapa interativo, prospecção e análise de concessões minerárias do Brasil."
            icon={Map}
            href="/mapa"
            colorClass="border-brand-teal/30 hover:border-brand-teal/60"
            iconColor="text-brand-teal"
          />
          <ModuleCard
            title="Mineral Intelligence"
            description="Inteligência de mercado mineral: preços, comércio exterior, royalties, produção."
            icon={TrendingUp}
            href="/inteligencia-comercial"
            colorClass="border-brand-gold/30 hover:border-brand-gold/60"
            iconColor="text-brand-gold"
          />
          <ModuleCard
            title="SQ Solutions"
            description="Soluções digitais com IA — Mineradora Modelo demo e gestão de segurança operacional."
            icon={Cpu}
            href="/mineradora-modelo"
            colorClass="border-brand-orange/30 hover:border-brand-orange/60"
            iconColor="text-brand-orange"
          />
          <ModuleCard
            title="Ferramentas Internas"
            description="Cockpit operacional Summo — riscos, projetos, planos de ação, comunicações."
            icon={Workflow}
            href="/planos-de-acao"
            colorClass="border-brand-orange/30 hover:border-brand-orange/60"
            iconColor="text-brand-orange"
            badge="Login Summo"
          />
          <ModuleCard
            title="Gestão Interna"
            description="Área restrita — gestão operacional e financeira da Summo."
            icon={Lock}
            href="#"
            colorClass="border-border opacity-60"
            iconColor="text-muted-foreground"
            disabled
          />
        </div>
      </section>

      {/* Highlights */}
      <section>
        <h2 className="font-heading text-lg font-semibold tracking-tight">Destaques</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Conteúdo aberto pra explorar a plataforma
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <HighlightCard
            icon={Map}
            title="Mapa Mineral do Brasil"
            description="Concessões ANM SIGMINE interativas, com filtros por substância e fase"
            href="/mapa"
          />
          <HighlightCard
            icon={TrendingUp}
            title="Inteligência de Mercado"
            description="Cotações, preços, comércio exterior e tendências do mercado mineral"
            href="/inteligencia-comercial"
          />
          <HighlightCard
            icon={ShieldCheck}
            title="Diligência Summo"
            description="Como funciona a DD ambiental moderna em 5 fases automatizadas"
            href="/ambiental"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border bg-card p-8 text-center">
        <h3 className="font-heading text-xl font-bold">Quer aprofundar?</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
          A Summo Quartile oferece consultoria estratégica em mineração e metalurgia,
          com sócios que somam décadas de experiência sênior no setor. Fale com nossa equipe.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <a
            href="https://summoquartile.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-orange/90 transition-colors"
          >
            Quero falar com a Summo
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   2. Consultor — cockpit operacional pessoal
   ══════════════════════════════════════════════════════════════════ */

function ConsultorHome({ nome }: { nome: string; userId: string }) {
  // Placeholder pra contagens; em sprint posterior buscamos os reais
  const [counts] = useState({ planos: 0, tarefasHoje: 0, atrasadas: 0 });

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

      {/* KPIs pessoais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Planos ativos" value={counts.planos} color="#156082" />
        <KPICard label="Tarefas hoje" value={counts.tarefasHoje} color="#27AE60" />
        <KPICard label="Atrasadas" value={counts.atrasadas} color="#E74C3C" />
        <KPICard label="Próximos 7 dias" value={0} color="#F39C12" />
      </div>

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
            <ToolLink href="/ambiental" icon={ShieldCheck} title="Summo Ambiental" desc="DD, viabilidade, pilhas" />
            <ToolLink href="/mapa" icon={Map} title="Direitos & Concessões" desc="Mapa e prospecção" />
            <ToolLink href="/inteligencia-comercial" icon={TrendingUp} title="Mineral Intelligence" desc="Mercado mineral" />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pt-2">
        Personalização avançada (suas tarefas, alertas e Kanban) chega na próxima sprint.
      </p>
    </div>
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

      {/* Atalhos consultor */}
      <ConsultorHome nome={nome} userId="" />
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
