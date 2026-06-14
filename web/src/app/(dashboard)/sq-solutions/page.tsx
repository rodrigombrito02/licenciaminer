"use client";

import { useEffect, useState } from "react";
import {
  Cpu, Activity, Thermometer, Bot, Radar, MapPin, Sparkles,
  Eye, Boxes,
} from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SQSolucoesCockpit } from "@/components/sqsolucoes-cockpit";
import { DemoMockup } from "@/components/sqsolucoes-demos";
import { MktHero, StatBand, MktSection, FeatureCard, CTABand } from "@/components/marketing-ui";
import { solApi, type CasoUso } from "@/lib/sqsolucoes-api";

const CASO_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity, Thermometer, Bot, Radar, MapPin,
};

function CasoCard({ c }: { c: CasoUso }) {
  const [demo, setDemo] = useState(false);
  const Icon = CASO_ICON[c.icon] ?? Activity;
  return (
    <Card className="border-2 hover:border-brand-orange/50 transition-colors">
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-brand-orange/15 p-2"><Icon className="h-5 w-5 text-brand-orange" /></div>
          <h3 className="font-bold text-sm">{c.nome}</h3>
        </div>
        <p className="text-xs"><span className="font-semibold text-muted-foreground">Dor:</span> {c.dor}</p>
        <p className="text-xs"><span className="font-semibold text-muted-foreground">Solução:</span> {c.solucao}</p>
        <p className="text-xs text-brand-teal"><span className="font-semibold">Resultado:</span> {c.resultado}</p>
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-1 flex-wrap">
            {c.parceiros.map((p) => <Badge key={p} variant="secondary" className="text-[9px]">{p}</Badge>)}
          </div>
          <button onClick={() => setDemo((v) => !v)} className="text-[11px] font-medium text-brand-orange hover:underline">
            {demo ? "Ocultar demo" : "Ver demo →"}
          </button>
        </div>
        {demo && <DemoMockup slug={c.slug} />}
      </CardContent>
    </Card>
  );
}

export default function SQSolucoesPage() {
  const [casos, setCasos] = useState<CasoUso[]>([]);
  useEffect(() => { solApi.meta().then((m) => setCasos(m.casos_uso)).catch(() => {}); }, []);

  return (
    <div className="space-y-12">
      <MktHero
        icon={Cpu}
        eyebrow="SQ Soluções · SST + Customer Success"
        cor="orange"
        title={<>Saúde e Segurança digital, com <span className="text-brand-gold">adoção garantida</span>.</>}
        subtitle="A SQ Soluções é a integradora de Saúde e Segurança do Trabalho — o intérprete entre os melhores fabricantes de SST e a realidade da sua operação, com Customer Success do piloto à rotina. Não somos revendedores: somos integradores."
        ctaLabel="Falar com a SQ"
      />

      <StatBand stats={[
        { value: "5 casos de uso", label: "antifadiga, térmico, inspeção, H×M, localização" },
        { value: "6 parceiros", label: "Rombit, SlateSafety, Kofre, RobotDog…" },
        { value: "SST + CS", label: "não revendedor: integrador" },
        { value: "Petrobras", label: "âncora em obras e refino" },
      ]} />

      {/* Casos de uso (anzol — não cardápio) — mantém as demos interativas */}
      <MktSection titulo="Por onde dói" sub="Entre pela sua dor — escolhemos o melhor parceiro para cada caso.">
        <div className="grid gap-4 md:grid-cols-2">
          {casos.map((c) => <CasoCard key={c.slug} c={c} />)}
        </div>
      </MktSection>

      {/* Por que integradora */}
      <MktSection titulo="Por que uma integradora" sub="O valor não está no equipamento — está em escolher, implantar e fazer usar.">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard icon={Sparkles} cor="orange" titulo="O melhor parceiro por caso"
            descricao="Não dependemos de um fabricante único — escolhemos a solução certa para cada dor." />
          <FeatureCard icon={Eye} cor="teal" titulo="Customer Success de verdade"
            descricao="Acompanhamos a adoção no campo e medimos o impacto — a tecnologia só vale se for usada." />
          <FeatureCard icon={Boxes} cor="gold" titulo="Da implantação à operação"
            descricao="Implantamos, monitoramos os equipamentos e operamos junto com o cliente." />
        </div>
      </MktSection>

      <CTABand titulo="Quer testar na sua operação?" sub="Estruturamos um piloto (POC) e medimos o impacto antes de qualquer compromisso. Fale com a SQ." />

      {/* Cockpit interno (Bernardo) */}
      <RoleGate minRole="consultor">
        <section>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-heading text-lg font-semibold">Cockpit de operação</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded">Interno · Bernardo</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Pipeline comercial SST, clientes e implantações (PM Suite), frota de equipamentos, parceiros e inteligência de concorrentes.
          </p>
          <SQSolucoesCockpit />
        </section>
      </RoleGate>
    </div>
  );
}
