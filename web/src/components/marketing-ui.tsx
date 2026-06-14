"use client";

/**
 * Kit de componentes de marketing para as landings públicas (vitrine).
 * Paleta SQ, seções com respiro — para vender produto, não listar cards soltos.
 */

import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

type Cor = "navy" | "teal" | "gold" | "orange";
const GRAD: Record<Cor, string> = {
  navy: "from-[#0A2540] via-[#13283f] to-[#0E7490]",
  teal: "from-[#0A2540] via-[#13384a] to-[#156082]",
  gold: "from-[#0A2540] via-[#2a2410] to-[#8a6d12]",
  orange: "from-[#0A2540] via-[#2c1d10] to-[#9c531a]",
};

/** Hero forte de landing. */
export function MktHero({
  eyebrow, title, subtitle, cor = "navy", ctaLabel = "Falar com a Summo", ctaHref = "/login",
  secondaryLabel, secondaryHref, icon: Icon,
}: {
  eyebrow?: string; title: React.ReactNode; subtitle?: string; cor?: Cor;
  ctaLabel?: string; ctaHref?: string; secondaryLabel?: string; secondaryHref?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${GRAD[cor]} px-7 py-12 lg:px-12 lg:py-16`}>
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "30px 30px" }} />
      <div className="relative z-10 max-w-3xl">
        {eyebrow && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-gold">
            {Icon && <Icon className="h-3.5 w-3.5" />} {eyebrow}
          </div>
        )}
        <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-white lg:text-[2.7rem]">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">{subtitle}</p>}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-gold/90 transition-colors">
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
          {secondaryLabel && secondaryHref && (
            <Link href={secondaryHref} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors">
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/** Banda de números-prova (dado real). */
export function StatBand({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
      {stats.map((s, i) => (
        <div key={i} className="bg-card p-5 text-center">
          <div className="font-heading text-2xl font-bold text-brand-teal lg:text-3xl">{s.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </section>
  );
}

/** Seção de título + subtítulo. */
export function MktSection({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-xl font-bold tracking-tight lg:text-2xl">{titulo}</h2>
      {sub && <p className="mt-1 mb-6 max-w-2xl text-sm text-muted-foreground">{sub}</p>}
      {!sub && <div className="mb-6" />}
      {children}
    </section>
  );
}

/** Card rico de feature/produto. */
export function FeatureCard({
  icon: Icon, titulo, descricao, bullets, cor = "teal", href, badge,
}: {
  icon: ComponentType<{ className?: string }>; titulo: string; descricao: string;
  bullets?: string[]; cor?: Cor; href?: string; badge?: string;
}) {
  const accent = { navy: "text-brand-navy", teal: "text-brand-teal", gold: "text-brand-gold", orange: "text-brand-orange" }[cor];
  const ring = { navy: "hover:border-brand-navy/40", teal: "hover:border-brand-teal/40", gold: "hover:border-brand-gold/50", orange: "hover:border-brand-orange/40" }[cor];
  const inner = (
    <div className={`group h-full rounded-2xl border border-border bg-card p-6 transition-all ${ring} hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className={`inline-flex rounded-xl bg-muted p-3 ${accent}`}><Icon className="h-6 w-6" /></div>
        {badge && <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{badge}</span>}
      </div>
      <h3 className="mt-4 font-heading text-base font-bold">{titulo}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{descricao}</p>
      {bullets && (
        <ul className="mt-3 space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
              <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accent}`} /> {b}
            </li>
          ))}
        </ul>
      )}
      {href && (
        <div className={`mt-4 flex items-center gap-1 text-sm font-medium ${accent} opacity-0 transition-opacity group-hover:opacity-100`}>
          Explorar <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

/** Banda de CTA de fechamento. */
export function CTABand({
  titulo = "Vamos transformar dado em decisão?",
  sub = "Fale com um consultor sênior da Summo Quartile.",
}: { titulo?: string; sub?: string }) {
  return (
    <section className="rounded-3xl border border-brand-gold/30 bg-gradient-to-br from-brand-navy to-[#0E7490] p-8 text-center text-white lg:p-10">
      <h2 className="font-heading text-2xl font-bold">{titulo}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-white/75">{sub}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-gold/90 transition-colors">
          Falar com a Summo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
