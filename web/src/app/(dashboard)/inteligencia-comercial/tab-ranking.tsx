"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Trophy, TrendingUp } from "lucide-react";

interface RankingRow {
  nome: string;
  valor: number;
  meta?: string;
}

export function RankingTab() {
  const [municipios, setMunicipios] = useState<RankingRow[] | null>(null);
  const [substancias, setSubstancias] = useState<RankingRow[] | null>(null);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
    fetch(`${API}/intelligence/cfem/top-municipios`)
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.rows || []).map((r: { municipio: string; total: number }) => ({
          nome: r.municipio,
          valor: r.total,
        }));
        setMunicipios(rows);
      })
      .catch(() => setMunicipios([]));

    fetch(`${API}/intelligence/cfem/top-substancias`)
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.rows || []).map((r: { substancia: string; total: number }) => ({
          nome: r.substancia,
          valor: r.total,
        }));
        setSubstancias(rows);
      })
      .catch(() => setSubstancias([]));
  }, []);

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="rounded-xl bg-gradient-to-r from-brand-gold/10 to-brand-orange/10 border border-brand-gold/30 p-5">
        <div className="flex items-start gap-3">
          <Trophy className="h-5 w-5 text-brand-gold flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm mb-1">Ranking da Mineração Brasileira</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Top municípios e substâncias por arrecadação de CFEM
              (Compensação Financeira pela Exploração de Recursos Minerais).
              Indicador transparente da concentração de receita mineral no país.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <RankingCard
          title="Top 15 Municípios por CFEM"
          subtitle="Receita acumulada — todas as substâncias"
          icon={MapPin}
          data={municipios}
          colorClass="text-brand-teal"
        />
        <RankingCard
          title="Top 15 Substâncias por CFEM"
          subtitle="Receita acumulada — todos os municípios"
          icon={TrendingUp}
          data={substancias}
          colorClass="text-brand-orange"
        />
      </div>

      {/* Insight institucional */}
      <Card className="border-brand-navy/20 bg-gradient-to-br from-brand-navy/5 to-transparent">
        <CardContent className="p-5">
          <h3 className="font-bold text-sm mb-2">Por que isso importa</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A CFEM é a principal fonte de transparência sobre quanto cada município
            recebe da atividade mineral. Para a Summo, esses dados são input para
            avaliação de oportunidades, due diligence e análises ESG dos clientes.
            <strong className="text-foreground"> Quer cruzar esses dados com sua estratégia?
            Fale conosco.</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  icon: Icon,
  data,
  colorClass,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  data: RankingRow[] | null;
  colorClass: string;
}) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Icon className={`h-4 w-4 ${colorClass}`} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const top15 = data.slice(0, 15);
  const max = Math.max(...top15.map((r) => r.valor));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          {title}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {top15.map((row, i) => {
          const pct = (row.valor / max) * 100;
          return (
            <div key={row.nome} className="text-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="flex items-center gap-2 min-w-0">
                  <Badge variant={i < 3 ? "default" : "secondary"} className={`text-[9px] font-bold tabular-nums w-6 justify-center ${i === 0 ? "bg-brand-gold" : i === 1 ? "bg-brand-teal" : i === 2 ? "bg-brand-orange" : ""}`}>
                    {i + 1}
                  </Badge>
                  <span className="truncate font-medium">
                    {capitalize(row.nome)}
                  </span>
                </span>
                <span className="tabular-nums text-muted-foreground flex-shrink-0">
                  R$ {fmtMilhoes(row.valor)}
                </span>
              </div>
              <div className="h-1 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full rounded ${i < 3 ? "bg-brand-gold" : "bg-brand-teal/40"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function fmtMilhoes(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} bi`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} mi`;
  return `${(v / 1000).toFixed(0)} mil`;
}

function capitalize(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
