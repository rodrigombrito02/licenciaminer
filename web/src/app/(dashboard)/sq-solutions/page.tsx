"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cpu, Activity, Thermometer, Bot, Radar, MapPin, ArrowRight, Sparkles,
  Eye, Boxes, Workflow,
} from "lucide-react";
import { ModuleHero } from "@/components/module-hero";
import { ValueProp } from "@/components/value-prop";
import { RoleGate } from "@/components/role-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SQSolucoesCockpit } from "@/components/sqsolucoes-cockpit";
import { DemoMockup } from "@/components/sqsolucoes-demos";
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
    <div className="space-y-8">
      <ModuleHero
        icon={Cpu}
        badge="SQ Soluções · SST + Customer Success"
        title="Saúde e Segurança digital — a SQ integra gestão, operação e tecnologia"
        description="Não somos revendedores: somos o intérprete entre os melhores fabricantes de SST e a realidade da sua operação — e garantimos a adoção (Customer Success)."
        variant="orange"
      />

      {/* Casos de uso (anzol — não cardápio) */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Por onde dói</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Entre pela sua dor — escolhemos o melhor parceiro para cada caso.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {casos.map((c) => <CasoCard key={c.slug} c={c} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border bg-card p-6 text-center">
        <h3 className="font-heading text-lg font-bold">Quer testar na sua operação?</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-lg mx-auto">
          Estruturamos um piloto (POC) e medimos o impacto antes de qualquer compromisso.
        </p>
        <Link href="/captacao" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-orange/90">
          Falar com a SQ <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Por que integradora */}
      <section>
        <h2 className="font-heading text-lg font-semibold mb-1">Por que uma integradora</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <ValueProp icon={Sparkles} title="O melhor parceiro por caso" description="Não dependemos de um fabricante único — escolhemos a solução certa para cada dor." color="orange" />
          <ValueProp icon={Eye} title="Customer Success de verdade" description="Acompanhamos a adoção no campo e medimos o impacto — a tecnologia só vale se for usada." color="teal" />
          <ValueProp icon={Boxes} title="Da implantação à operação" description="Implantamos, monitoramos os equipamentos e operamos junto com o cliente." color="gold" />
        </div>
      </section>

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
