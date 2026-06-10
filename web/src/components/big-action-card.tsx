"use client";

/**
 * Card grande de acao usado nas capas. Padrao visual consistente
 * em todo o sistema.
 */

import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BigActionCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  color?: "teal" | "gold" | "orange" | "navy";
  badge?: string;
  comingSoon?: boolean;
}

const COLORS = {
  teal: {
    border: "border-brand-teal/30 hover:border-brand-teal",
    bg: "bg-brand-teal/5 group-hover:bg-brand-teal/10",
    iconBg: "bg-brand-teal/15 group-hover:bg-brand-teal/25",
    iconColor: "text-brand-teal",
    title: "group-hover:text-brand-teal",
  },
  gold: {
    border: "border-brand-gold/40 hover:border-brand-gold",
    bg: "bg-brand-gold/5 group-hover:bg-brand-gold/10",
    iconBg: "bg-brand-gold/15 group-hover:bg-brand-gold/25",
    iconColor: "text-brand-gold",
    title: "group-hover:text-brand-gold",
  },
  orange: {
    border: "border-brand-orange/30 hover:border-brand-orange",
    bg: "bg-brand-orange/5 group-hover:bg-brand-orange/10",
    iconBg: "bg-brand-orange/15 group-hover:bg-brand-orange/25",
    iconColor: "text-brand-orange",
    title: "group-hover:text-brand-orange",
  },
  navy: {
    border: "border-brand-navy/30 hover:border-brand-navy",
    bg: "bg-brand-navy/5 group-hover:bg-brand-navy/10",
    iconBg: "bg-brand-navy/15 group-hover:bg-brand-navy/25",
    iconColor: "text-brand-navy",
    title: "group-hover:text-brand-navy",
  },
};

export function BigActionCard({
  icon: Icon,
  title,
  description,
  href,
  color = "teal",
  badge,
  comingSoon,
}: BigActionCardProps) {
  const colorMap = COLORS[color];
  const inner = (
    <Card
      className={`group h-full border-2 ${
        comingSoon
          ? "border-dashed border-muted-foreground/30"
          : `${colorMap.border} ${colorMap.bg}`
      } transition-all ${comingSoon ? "" : "cursor-pointer"}`}
    >
      <CardContent className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className={`inline-flex rounded-xl p-3 ${comingSoon ? "bg-muted" : colorMap.iconBg} transition-colors`}>
            <Icon className={`h-7 w-7 ${comingSoon ? "text-muted-foreground" : colorMap.iconColor}`} />
          </div>
          {badge && (
            <Badge variant="outline" className="text-[10px]">{badge}</Badge>
          )}
          {comingSoon && (
            <Badge variant="secondary" className="text-[10px]">Em breve</Badge>
          )}
        </div>
        <h3 className={`font-heading text-base font-bold ${comingSoon ? "text-muted-foreground" : colorMap.title} transition-colors`}>
          {title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        {!comingSoon && (
          <div className={`flex items-center gap-1 text-xs ${colorMap.iconColor} font-medium pt-1`}>
            Acessar <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  return comingSoon ? <div>{inner}</div> : <Link href={href}>{inner}</Link>;
}
