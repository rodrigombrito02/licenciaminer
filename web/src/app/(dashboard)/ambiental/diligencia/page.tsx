"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Layers,
  FileSearch,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DiligenciaPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/ambiental" className="text-xs text-brand-teal hover:underline inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3 w-3" /> Voltar para Summo Ambiental
        </Link>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-brand-orange" />
          Diligência Summo
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Metodologia automatizada de Due Diligence em 5 fases (PDCA) com identidade
          Summo, aplicada a diferentes objetos de conformidade.
        </p>
      </div>

      {/* Objetos de diligência */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Objetos de diligência disponíveis</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Cada objeto tem inventário documental próprio, requisitos auditáveis e
          relatório com identidade Summo.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <DiligenciaCard
            icon={ShieldCheck}
            title="Licenciamento Ambiental"
            description="Due Diligence em 5 fases (PDCA) sobre documentos e requisitos de licenciamento mineral em Minas Gerais e federal."
            href="/due-diligence"
            badge="Ativo"
            highlights={[
              "5 fases automatizadas (Configuração → Resultado)",
              "Inventário documental por modalidade (LAS RAS, LAC1/2, LP/LI/LO)",
              "Relatório HTML pronto para apresentação",
              "Exportação XLSX em 4 abas",
            ]}
          />
          <DiligenciaCard
            icon={Layers}
            title="Conformidade de Pilhas"
            description="Auditoria de pilhas de rejeito/estéril em 3 modos: Auditoria de ativo existente, Licenciamento e Fechamento."
            href="/pilhas"
            badge="Premium GISTM"
            highlights={[
              "85 documentos do arcabouço (BR + GISTM)",
              "186 requisitos auditáveis estruturados",
              "Overlay GISTM Premium (15 princípios ICMM)",
              "Portal Público PL 2.519 (MG) automatizado",
            ]}
          />
          <DiligenciaCard
            icon={FileSearch}
            title="Outros objetos de conformidade"
            description="Próximos: NRs de segurança (NR-22, NR-01, NR-35), Condicionantes ambientais ao longo do tempo, ESG/CSRD para exportadoras."
            href="#"
            badge="Em construção"
            comingSoon
            highlights={[
              "NRs (segurança em mineração)",
              "Condicionantes (rastreio temporal)",
              "ESG / CSRD (CSRD UE 2026)",
              "Sistemas elétricos industriais",
            ]}
          />
        </div>
      </section>

      {/* Metodologia DD em 5 fases */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Metodologia em 5 fases (PDCA)</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Aplicável a qualquer objeto de conformidade.
        </p>
        <div className="grid md:grid-cols-5 gap-3">
          {[
            { num: 1, title: "Configuração", desc: "Escopo + perfil de risco" },
            { num: 2, title: "Diagnóstico", desc: "Inventário documental" },
            { num: 3, title: "Avaliação", desc: "Requisitos + criticidade" },
            { num: 4, title: "Plano de Ação", desc: "PDCA estruturado" },
            { num: 5, title: "Resultado", desc: "Score + recomendações" },
          ].map((f) => (
            <Card key={f.num} className="border-2">
              <CardContent className="p-4 text-center space-y-1">
                <div className="text-xl font-bold text-brand-teal">{f.num}</div>
                <div className="text-xs font-semibold">{f.title}</div>
                <div className="text-[10px] text-muted-foreground">{f.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function DiligenciaCard({
  icon: Icon,
  title,
  description,
  href,
  badge,
  highlights,
  comingSoon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  badge?: string;
  highlights: string[];
  comingSoon?: boolean;
}) {
  const inner = (
    <Card className={`h-full border-2 ${comingSoon ? "border-dashed border-muted-foreground/30" : "border-brand-teal/20 hover:border-brand-teal hover:shadow-md transition-all group cursor-pointer"}`}>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="rounded-lg bg-brand-teal/10 p-2.5">
            <Icon className={`h-6 w-6 ${comingSoon ? "text-muted-foreground" : "text-brand-teal"}`} />
          </div>
          {badge && (
            <Badge variant="outline" className={`text-[10px] ${comingSoon ? "" : "border-brand-gold/40 text-brand-gold bg-brand-gold/5"}`}>
              {badge}
            </Badge>
          )}
        </div>
        <h3 className={`font-heading text-base font-bold ${comingSoon ? "text-muted-foreground" : ""}`}>
          {title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        <ul className="space-y-1 pt-1">
          {highlights.map((h) => (
            <li key={h} className="text-xs flex items-start gap-1.5">
              <span className="text-brand-teal flex-shrink-0">▸</span>
              <span className={comingSoon ? "text-muted-foreground" : ""}>{h}</span>
            </li>
          ))}
        </ul>
        {!comingSoon && (
          <div className="flex items-center gap-1 text-xs text-brand-teal font-medium pt-2">
            Acessar <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  return comingSoon ? <div>{inner}</div> : <Link href={href}>{inner}</Link>;
}
