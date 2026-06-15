"use client";

/**
 * Visuais para os heros das landings (card claro sobre o hero escuro).
 * Mineral Intelligence e Ativos usam DADO REAL (endpoints públicos /api/mi);
 * Ambiental e Consultoria são previews de conceito (dado real exigiria expor
 * informação interna/de cliente).
 */

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/* ── SQ Ambiental: Radar de Condicionantes ── */
export function AmbientalVisual() {
  const itens = [
    { t: "Outorga de água (LO)", p: "vence em 18 dias", c: "#E67E22" },
    { t: "Plano de recuperação (PRAD)", p: "em dia", c: "#27AE60" },
    { t: "TAH — pagamento anual (ANM)", p: "vence em 41 dias", c: "#FFC000" },
    { t: "Monitoramento de fauna", p: "concluído", c: "#27AE60" },
  ];
  return (
    <Frame titulo="Radar de Compliance" tag="ambiental + ANM">
      <div className="space-y-1.5">
        {itens.map((i) => (
          <div key={i.t} className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5">
            <span className="text-[11px] text-slate-700 truncate">{i.t}</span>
            <span className="text-[10px] font-semibold shrink-0" style={{ color: i.c }}>{i.p}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── Ativos Minerários: minerais estratégicos (DADO REAL · SCM/ANM) ── */
export function AtivosVisual() {
  const [bars, setBars] = useState<{ l: string; v: number }[] | null>(null);
  useEffect(() => {
    fetch(`${API}/mi/radar-estrategicos`).then((r) => r.json()).then((d) => {
      const top = (d.por_substancia ?? []).slice(0, 5)
        .map((x: { substancia: string; n: number }) => ({ l: cap(x.substancia), v: x.n }));
      setBars(top);
    }).catch(() => setBars([]));
  }, []);
  const max = Math.max(1, ...(bars ?? []).map((b) => b.v));
  return (
    <Frame titulo="Requerimentos por substância" tag="minerais estratégicos · ANM">
      <div className="space-y-1.5 min-h-[120px]">
        {bars === null ? <Spin /> : bars.map((b) => (
          <div key={b.l}>
            <div className="flex justify-between text-[10px] text-slate-600">
              <span className="truncate">{b.l}</span><span className="font-semibold tabular-nums">{b.v.toLocaleString("pt-BR")}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-brand-teal" style={{ width: `${(b.v / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── SQ Consultoria: Régua de Excelência (7 áreas) ── */
export function ConsultoriaVisual() {
  const areas = [
    { a: "Planejamento", v: 82 }, { a: "Operação", v: 64 }, { a: "Processamento", v: 71 },
    { a: "Rejeitos/MA", v: 55 }, { a: "Manutenção", v: 68 }, { a: "SSMA-ESG", v: 60 },
  ];
  return (
    <Frame titulo="Régua de Excelência" tag="diagnóstico por área">
      <div className="space-y-1.5">
        {areas.map((x) => (
          <div key={x.a}>
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>{x.a}</span><span className="font-semibold">{x.v}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${x.v}%`, background: x.v >= 75 ? "#27AE60" : x.v >= 60 ? "#FFC000" : "#E67E22" }} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ── SQ Mineral Intelligence: Monitor CFEM (DADO REAL · ANM) ── */
export function IntelligenceVisual() {
  const [bars, setBars] = useState<{ l: string; v: number }[] | null>(null);
  useEffect(() => {
    fetch(`${API}/mi/monitor-cfem?ano=2025&limit=5`).then((r) => r.json()).then((d) => {
      const top = (d.ranking ?? []).slice(0, 5)
        .map((x: { substancia: string; valor_recolhido: number }) => ({ l: cap(x.substancia), v: x.valor_recolhido || 0 }));
      setBars(top);
    }).catch(() => setBars([]));
  }, []);
  const max = Math.max(1, ...(bars ?? []).map((b) => b.v));
  return (
    <Frame titulo="Monitor CFEM" tag="arrecadação 2025 · ANM">
      {bars === null ? <div className="h-24 flex items-center justify-center"><Spin /></div> : (
        <div className="flex items-end gap-2 h-24 px-1">
          {bars.map((b) => (
            <div key={b.l} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-gradient-to-t from-brand-teal to-brand-gold" style={{ height: `${Math.max(6, (b.v / max) * 100)}%` }} title={`R$ ${(b.v/1e6).toFixed(0)} mi`} />
              <span className="text-[8px] text-slate-600 truncate w-full text-center">{b.l}</span>
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}

function Spin() {
  return <div className="h-4 w-4 rounded-full border-2 border-brand-teal border-t-transparent animate-spin mx-auto" />;
}
function cap(s: string): string {
  if (!s) return "—";
  const t = s.toLowerCase().replace("minério de ", "").replace("minerio de ", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Frame({ titulo, tag, children }: { titulo: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-2xl ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-brand-navy">{titulo}</span>
        <span className="rounded-full bg-brand-teal/10 px-2 py-0.5 text-[9px] font-semibold text-brand-teal">{tag}</span>
      </div>
      {children}
      <p className="mt-2 text-[9px] text-slate-400 text-center">Ilustrativo</p>
    </div>
  );
}
