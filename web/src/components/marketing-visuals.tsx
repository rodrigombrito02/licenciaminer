"use client";

/**
 * Visuais ilustrativos para os heros das landings (mockups "preview" do produto,
 * em card claro sobre o hero escuro). Sem dado real sensível — ilustrativo.
 */

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

/* ── Ativos Minerários: mapa + trilha ── */
export function AtivosVisual() {
  const etapas = ["Pesquisa", "RFP", "Lavra", "Operação"];
  return (
    <Frame titulo="Trilha do Ativo" tag="do mapa à operação">
      <svg viewBox="0 0 240 90" className="w-full rounded bg-slate-100" style={{ height: 80 }}>
        {[[30,30],[70,55],[120,35],[170,60],[200,30]].map(([x,y],i)=>(
          <polygon key={i} points={`${x},${y} ${x+18},${y-6} ${x+22},${y+10} ${x+4},${y+16}`}
            fill={["#0E7490","#156082","#22C55E","#F59E0B","#0E7490"][i]} opacity="0.75" />
        ))}
      </svg>
      <div className="mt-2 flex items-center gap-1">
        {etapas.map((e, i) => (
          <div key={e} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${i <= 2 ? "bg-emerald-500" : "bg-slate-300"}`} />
            <span className="text-[9px] text-slate-600">{e}</span>
            {i < etapas.length - 1 && <span className="text-slate-300 text-[9px]">›</span>}
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

/* ── SQ Mineral Intelligence: gráfico CFEM ── */
export function IntelligenceVisual() {
  const bars = [
    { l: "Ferro", v: 100 }, { l: "Ouro", v: 42 }, { l: "Fosfato", v: 28 },
    { l: "Calcário", v: 20 }, { l: "Bauxita", v: 16 },
  ];
  return (
    <Frame titulo="Monitor CFEM" tag="arrecadação 2025">
      <div className="flex items-end gap-2 h-24 px-1">
        {bars.map((b) => (
          <div key={b.l} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t bg-gradient-to-t from-brand-teal to-brand-gold" style={{ height: `${b.v}%` }} />
            <span className="text-[9px] text-slate-600">{b.l}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
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
