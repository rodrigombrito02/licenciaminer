"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, FileText, Bell, Database, ArrowRight, Lock } from "lucide-react";
import { useEffectiveRole as useRole } from "@/hooks/use-effective-role";

export function PremiumTab() {
  const roleState = useRole();
  const isPagoOrAbove = roleState.status === "authenticated" && roleState.role !== "visitante_free";

  return (
    <div className="space-y-5">
      {/* Hero Premium */}
      <Card className="border-2 border-brand-gold/40 bg-gradient-to-br from-brand-gold/10 via-brand-orange/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-brand-gold/20 p-3 flex-shrink-0">
              <Crown className="h-6 w-6 text-brand-gold" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-heading text-lg font-bold">Mineral Intelligence Premium</h3>
                {!isPagoOrAbove ? (
                  <Badge variant="outline" className="border-brand-gold/40 text-brand-gold text-xs">
                    <Lock className="h-2.5 w-2.5 mr-1" /> Acesso premium
                  </Badge>
                ) : (
                  <Badge className="bg-brand-gold text-brand-navy text-xs">
                    Liberado para você
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Conteúdo aprofundado e personalizado para tomada de decisão estratégica.
                Análises customizadas pela equipe Summo a partir das bases públicas + curadoria
                interna.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* O que está incluso */}
      <div>
        <h3 className="font-bold text-sm mb-3">O que está incluso</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <PremiumFeature
            icon={FileText}
            title="Relatório Mensal por Substância"
            description="PDF executivo (~15 páginas) com tendências de preço, produção, comércio exterior, regulatório e perspectivas para ferro, ouro, nióbio, cobre, etc."
            available={isPagoOrAbove}
          />
          <PremiumFeature
            icon={Bell}
            title="Alertas Customizados"
            description="Alertas por e-mail quando indicadores cruzam thresholds que você define (preço, CFEM, processo ANM em sua substância de interesse)."
            available={isPagoOrAbove}
          />
          <PremiumFeature
            icon={Database}
            title="Exportação de Dataset Curado"
            description="Datasets em parquet/CSV prontos para análise (decisões SEMAD, ANM SIGMINE, CFEM por município, infrações IBAMA) com metadados e dicionário."
            available={isPagoOrAbove}
          />
          <PremiumFeature
            icon={Crown}
            title="Sessão de Briefing Trimestral"
            description="Reunião de 1h com analistas Summo para apresentar contexto setorial customizado para sua empresa/oportunidade."
            available={isPagoOrAbove}
          />
        </div>
      </div>

      {/* CTA */}
      {!isPagoOrAbove && (
        <Card className="border-2 border-dashed border-brand-gold/40">
          <CardContent className="p-6 text-center space-y-3">
            <Crown className="h-10 w-10 text-brand-gold mx-auto" />
            <h3 className="font-heading text-lg font-bold">Quer acesso?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              O Mineral Intelligence Premium está em fase final de preparação.
              Manifeste interesse para entrar na primeira leva.
            </p>
            <Button asChild className="bg-brand-orange hover:bg-brand-orange/90">
              <a href="https://summoquartile.com" target="_blank" rel="noopener noreferrer">
                Quero saber mais
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {isPagoOrAbove && (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Os relatórios e exportações estarão disponíveis aqui em breve.
              Estamos finalizando a pipeline de geração.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PremiumFeature({
  icon: Icon,
  title,
  description,
  available,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  available: boolean;
}) {
  return (
    <Card className={available ? "border-brand-gold/30" : "opacity-70"}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-brand-gold" />
          <h4 className="font-bold text-sm">{title}</h4>
          {!available && <Lock className="h-3 w-3 text-muted-foreground ml-auto" />}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
