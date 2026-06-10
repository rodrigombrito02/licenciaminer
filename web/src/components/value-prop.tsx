"use client";

/**
 * Cards de "value prop" — diferenciais do modulo, exibidos abaixo das
 * acoes principais nas capas. Padrao visual coerente em todo o sistema.
 */

import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface ValuePropProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color?: "teal" | "gold" | "orange" | "navy";
}

const COLORS = {
  teal: "border-l-brand-teal bg-brand-teal/5 [&_svg]:text-brand-teal",
  gold: "border-l-brand-gold bg-brand-gold/5 [&_svg]:text-brand-gold",
  orange: "border-l-brand-orange bg-brand-orange/5 [&_svg]:text-brand-orange",
  navy: "border-l-brand-navy bg-brand-navy/5 [&_svg]:text-brand-navy",
};

export function ValueProp({ icon: Icon, title, description, color = "teal" }: ValuePropProps) {
  return (
    <Card className={`border-l-4 ${COLORS[color]}`}>
      <CardContent className="p-4 space-y-2">
        <Icon className="h-5 w-5" />
        <h4 className="font-bold text-sm text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
