"use client";

import {
  Target,
  Compass,
  Calculator,
  FileText,
  Users,
  CheckCircle2,
  Wrench,
  Factory,
} from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OportunidadesPage() {
  return (
    <div className="space-y-8">
      <ModuleHero
        icon={Target}
        badge="Funil de Oportunidades"
        title="Prospecção e avaliação de direitos minerários"
        description="Funil completo de oportunidades para sócios — da prospecção à operação, passando por avaliação multi-parâmetro e relatório de viabilidade Summo."
        variant="gold"
      />

      {/* Banner em construção */}
      <Card className="border-2 border-dashed border-brand-gold/40 bg-brand-gold/5">
        <CardContent className="p-5 text-center space-y-2">
          <Badge className="bg-brand-gold/20 text-brand-gold border-brand-gold/40">
            Em construção — Sprint 4
          </Badge>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Este módulo está em fase de implementação. O fluxo, parâmetros de avaliação
            e relatório de viabilidade são apresentados abaixo. Pronto para sócios validarem
            o design antes da construção.
          </p>
        </CardContent>
      </Card>

      {/* Funil em 8 etapas */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Funil em 8 etapas</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Da prospecção à operação.
        </p>
        <div className="grid md:grid-cols-4 gap-2">
          {[
            { num: 1, title: "Prospect", icon: Compass, desc: "Busca ativa" },
            { num: 2, title: "Avaliação", icon: Calculator, desc: "9 parâmetros" },
            { num: 3, title: "Relatório", icon: FileText, desc: "Viabilidade Summo" },
            { num: 4, title: "Investidores", icon: Users, desc: "Captação" },
            { num: 5, title: "Aprovação", icon: CheckCircle2, desc: "Decisão go/no-go" },
            { num: 6, title: "Estruturação", icon: Wrench, desc: "Projeto detalhado" },
            { num: 7, title: "Implantação", icon: Wrench, desc: "Execução" },
            { num: 8, title: "Operação", icon: Factory, desc: "Produção ativa" },
          ].map((f) => (
            <Card key={f.num} className="border-2">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-brand-gold text-brand-navy w-7 h-7 flex items-center justify-center p-0 text-xs">
                    {f.num}
                  </Badge>
                  <f.icon className="h-4 w-4 text-brand-teal" />
                </div>
                <div className="text-xs font-bold">{f.title}</div>
                <div className="text-[10px] text-muted-foreground">{f.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 9 parâmetros de avaliação */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">9 parâmetros de avaliação</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Critérios consolidados no Relatório de Viabilidade Summo (etapa 3).
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { n: 1, t: "Disponibilidade de Água", d: "ANA outorgas + bacias + UCs hídricas. Vazão regional, conflitos de uso." },
            { n: 2, t: "Energia", d: "ANEEL geração/transmissão + distância a subestações. Capacidade local e custo de conexão." },
            { n: 3, t: "Logística", d: "DNIT rodovias + ANTT ferrovias + ANTAQ portos. Distância ao escoamento." },
            { n: 4, t: "Mão de obra", d: "IBGE PNAD/Caged + RAIS + universidades. Skill disponível e custo regional." },
            { n: 5, t: "Licenciamento", d: "Probabilidade histórica via módulo /viabilidade. Risco regulatório." },
            { n: 6, t: "Financeiro", d: "CFEM + commodities + opex/capex regionais. TIR/Payback estimado." },
            { n: 7, t: "Stakeholder & ESG", d: "UCs/TIs + comunidades + biomas sensíveis. Risco social/ambiental." },
            { n: 8, t: "Potencial geológico", d: "CPRM + dados públicos + reservas. Qualidade do depósito (sugestão)." },
            { n: 9, t: "Risco climático", d: "CEMADEN + INMET. Eventos extremos previsíveis (sugestão)." },
          ].map((p) => (
            <Card key={p.n}>
              <CardContent className="p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs w-7 h-7 flex items-center justify-center p-0 font-bold">
                    {p.n}
                  </Badge>
                  <h4 className="font-bold text-sm">{p.t}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* O que o módulo vai entregar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">O que estará disponível</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>✓ Kanban visual do funil (todas as etapas)</li>
            <li>✓ Cadastro de oportunidade com snapshot do polígono ANM</li>
            <li>✓ Avaliação multi-parâmetro com gauge de score</li>
            <li>✓ Geração automática de Relatório Completo de Viabilidade (HTML/PDF, identidade Summo)</li>
            <li>✓ Integração com /mapa pra prospectar e adicionar ao funil</li>
            <li>✓ Histórico de avaliações + comparativo entre oportunidades</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
