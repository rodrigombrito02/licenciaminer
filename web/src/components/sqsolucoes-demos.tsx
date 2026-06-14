"use client";

/**
 * Mockups ilustrativos das demos por caso de uso (SQ Soluções).
 * Sem dado real — visuais para o cliente "ver" a solução. Rotulados como ilustrativos.
 */

export function DemoMockup({ slug }: { slug: string }) {
  const map: Record<string, React.ReactNode> = {
    localizacao_acesso: <DemoLocalizacao />,
    seguranca_hm: <DemoZonas />,
    antifadiga: <DemoBiometrico />,
    estresse_termico: <DemoBiometrico termico />,
    inspecao_robotica: <DemoInspecao />,
  };
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      {map[slug] ?? <p className="text-xs text-muted-foreground">Demo em preparação.</p>}
      <p className="mt-2 text-[10px] text-muted-foreground/70 italic text-center">Demonstração ilustrativa — dados fictícios.</p>
    </div>
  );
}

/* ── Kofre: localização de equipe + SOS + headcount ── */
function DemoLocalizacao() {
  const dots = [
    { x: 40, y: 50, c: "#22C55E" }, { x: 90, y: 80, c: "#22C55E" },
    { x: 150, y: 40, c: "#22C55E" }, { x: 200, y: 95, c: "#EF4444", sos: true },
    { x: 250, y: 60, c: "#22C55E" }, { x: 120, y: 110, c: "#22C55E" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold">Localização de equipe · tempo real</span>
        <span className="text-[10px] rounded bg-green-100 text-green-800 px-1.5 py-0.5">Headcount: 6</span>
      </div>
      <svg viewBox="0 0 300 140" className="w-full rounded bg-[#0A2540]/5" style={{ height: 120 }}>
        <rect x="20" y="20" width="120" height="100" fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 3" />
        <rect x="160" y="20" width="120" height="100" fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 3" />
        <text x="25" y="33" fontSize="8" fill="#64748B">Galeria A</text>
        <text x="165" y="33" fontSize="8" fill="#64748B">Pátio B</text>
        {dots.map((d, i) => (
          <g key={i}>
            {d.sos && <circle cx={d.x} cy={d.y} r="11" fill="#EF4444" opacity="0.25"><animate attributeName="r" values="8;16;8" dur="1.4s" repeatCount="indefinite" /></circle>}
            <circle cx={d.x} cy={d.y} r="5" fill={d.c} stroke="#fff" strokeWidth="1.5" />
            {d.sos && <text x={d.x} y={d.y - 14} fontSize="8" fill="#EF4444" textAnchor="middle" fontWeight="bold">SOS</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ── Rombit: 3 zonas + colisão homem×máquina ── */
function DemoZonas() {
  return (
    <div>
      <span className="text-[11px] font-semibold mb-1.5 block">Segurança homem×máquina · zonas dinâmicas</span>
      <svg viewBox="0 0 300 140" className="w-full rounded" style={{ height: 120 }}>
        <ellipse cx="150" cy="80" rx="120" ry="50" fill="#22C55E" opacity="0.15" />
        <ellipse cx="150" cy="80" rx="80" ry="35" fill="#F59E0B" opacity="0.2" />
        <ellipse cx="150" cy="80" rx="45" ry="22" fill="#EF4444" opacity="0.28" />
        {/* máquina */}
        <rect x="135" y="68" width="30" height="22" rx="3" fill="#0E7490" />
        <text x="150" y="83" fontSize="8" fill="#fff" textAnchor="middle">🚜</text>
        {/* trabalhador entrando na zona amarela */}
        <circle cx="95" cy="80" r="6" fill="#F59E0B" stroke="#fff" strokeWidth="1.5">
          <animate attributeName="cx" values="60;95;60" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x="20" y="20" fontSize="8" fill="#16A34A">● Seguro</text>
        <text x="80" y="20" fontSize="8" fill="#D97706">● Atenção</text>
        <text x="150" y="20" fontSize="8" fill="#DC2626">● Crítico</text>
      </svg>
      <div className="flex items-center gap-1.5 text-[10px] text-amber-700 mt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Alerta amarelo: aproximação detectada
      </div>
    </div>
  );
}

/* ── SlateSafety/Dersalis: painel biométrico ── */
function DemoBiometrico({ termico = false }: { termico?: boolean }) {
  const metrics = termico
    ? [{ l: "Temp. corporal", v: "38,4°C", warn: true }, { l: "FC", v: "118 bpm", warn: false }, { l: "Esforço", v: "Alto", warn: true }]
    : [{ l: "FC", v: "132 bpm", warn: true }, { l: "HRV", v: "21 ms", warn: true }, { l: "Esforço", v: "Elevado", warn: true }];
  return (
    <div>
      <span className="text-[11px] font-semibold mb-1.5 block">{termico ? "Estresse térmico" : "Antifadiga"} · monitor biométrico</span>
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.l} className={`rounded-lg border p-2 text-center ${m.warn ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
            <div className={`text-sm font-bold ${m.warn ? "text-red-700" : "text-green-700"}`}>{m.v}</div>
            <div className="text-[9px] text-muted-foreground">{m.l}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-red-700 mt-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Alerta antecipado — intervir antes do incidente
      </div>
    </div>
  );
}

/* ── RobotDog: trajeto de inspeção + anomalias ── */
function DemoInspecao() {
  const points = [
    { x: 50, y: 90, ok: true }, { x: 110, y: 50, ok: true },
    { x: 170, y: 95, ok: false }, { x: 240, y: 55, ok: true },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold">Inspeção robótica · visão computacional</span>
        <span className="text-[10px] rounded bg-amber-100 text-amber-800 px-1.5 py-0.5">1 anomalia</span>
      </div>
      <svg viewBox="0 0 300 130" className="w-full rounded bg-[#0A2540]/5" style={{ height: 110 }}>
        <polyline points="50,90 110,50 170,95 240,55" fill="none" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="4 3" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6" fill={p.ok ? "#22C55E" : "#F59E0B"} stroke="#fff" strokeWidth="1.5" />
            {!p.ok && <rect x={p.x - 12} y={p.y - 24} width="40" height="14" rx="2" fill="#F59E0B" />}
            {!p.ok && <text x={p.x + 8} y={p.y - 14} fontSize="7" fill="#fff" textAnchor="middle">roleta ⚠</text>}
          </g>
        ))}
        {/* robô */}
        <text x="38" y="95" fontSize="14">🐕‍🦺</text>
      </svg>
      <p className="text-[10px] text-muted-foreground mt-1">4 pontos inspecionados · 1 desalinhamento de rolete detectado</p>
    </div>
  );
}
