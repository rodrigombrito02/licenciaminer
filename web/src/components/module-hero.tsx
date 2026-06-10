"use client";

/**
 * Componente compartilhado pra hero das capas de modulo.
 * Garante coerencia visual em todo o sistema:
 *
 *   <ModuleHero
 *     icon={ShieldCheck}
 *     badge="Summo Ambiental"
 *     title="Análise e conformidade ambiental para mineração"
 *     description="Dados públicos auditáveis..."
 *   />
 */

import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";

interface ModuleHeroProps {
  icon: ComponentType<{ className?: string }>;
  badge: string;
  title: string;
  description: string;
  variant?: "teal" | "gold" | "orange" | "navy";
}

const VARIANTS = {
  teal: "from-[#0A2540] via-[#156082] to-[#0A2540]",
  gold: "from-[#0A2540] via-[#1A2C42] to-[#3a2a0a]",
  orange: "from-[#0A2540] via-[#1A2C42] to-[#3a1a0a]",
  navy: "from-[#0A2540] via-[#1A2C42] to-[#0A2540]",
};

const BADGE_BG = {
  teal: "bg-brand-teal/30",
  gold: "bg-brand-gold/30",
  orange: "bg-brand-orange/30",
  navy: "bg-brand-navy/30",
};

export function ModuleHero({
  icon: Icon,
  badge,
  title,
  description,
  variant = "teal",
}: ModuleHeroProps) {
  return (
    <section className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${VARIANTS[variant]} px-7 py-10 lg:py-12`}>
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative z-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-3">
          <div className={`rounded-lg ${BADGE_BG[variant]} p-2`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <Badge className="bg-brand-gold/20 text-brand-gold border-brand-gold/40">
            {badge}
          </Badge>
        </div>
        <h1 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-white mb-2">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-white/70 max-w-2xl">
          {description}
        </p>
      </div>
    </section>
  );
}
