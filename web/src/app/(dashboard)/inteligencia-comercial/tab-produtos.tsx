"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, TrendingUp, Layers, Factory, Gavel, ArrowRight, Lock,
  Activity, Building2, Globe, Anchor,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(0)} mi`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

/** Produtos organizados por PERGUNTA do cliente (não cardápio). */
const ANDARES = [
  {
    icon: Activity, titulo: "Pulso do mercado", cor: "#156082",
    pergunta: "O que está acontecendo no mercado mineral?",
    produtos: ["F · Clipping setorial", "B · Monitor CFEM", "D · Radar de Minerais Estratégicos"],
  },
  {
    icon: Building2, titulo: "Ativo & titular", cor: "#0E7490",
    pergunta: "Quanto vale, de quem é, quem está consolidando?",
    produtos: ["C · Due Diligence de Ativo", "H · Radar de Consolidação / M&A"],
  },
  {
    icon: Globe, titulo: "Transição & futuro", cor: "#1565C0",
    pergunta: "Onde está a oportunidade do CBAM / aço verde?",
    produtos: ["A · Atlas DR-Grade Brasil", "E · Green Iron / CBAM Brief", "I · Índice de Logística Mineral"],
  },
  {
    icon: Gavel, titulo: "Fiscalização", cor: "#0A2540",
    pergunta: "O recolhimento está correto?",
    produtos: ["G · Auditoria independente de CFEM (B2G)"],
  },
];

export function ProdutosTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-brand-gold/30 bg-gradient-to-r from-brand-gold/10 to-transparent p-4">
        <p className="text-sm">
          <strong>Inteligência que ninguém entrega no grão brasileiro.</strong> Abaixo, o que você
          receberia — com amostras geradas de bases públicas oficiais. Cada produto responde a uma
          pergunta concreta da sua mesa.
        </p>
      </div>

      {/* Clipping da semana (isca freemium) */}
      <ClippingPreview />

      {/* Previews ao vivo (dado real) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PipelinePreview />
        <MonitorCfemPreview />
        <RadarEstrategicosPreview />
        <AtlasFerroPreview />
      </div>

      {/* Os 9 produtos por andar */}
      <div>
        <h3 className="font-heading text-lg font-semibold mb-1">Os produtos, por pergunta</h3>
        <p className="text-sm text-muted-foreground mb-4">Você não escolhe num cardápio — entra pela sua dor.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {ANDARES.map((a) => (
            <Card key={a.titulo} className="border-l-4" style={{ borderLeftColor: a.cor }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <a.icon className="h-4 w-4" style={{ color: a.cor }} />
                  <h4 className="font-bold text-sm">{a.titulo}</h4>
                </div>
                <p className="text-xs text-muted-foreground italic mb-2">"{a.pergunta}"</p>
                <ul className="space-y-0.5">
                  {a.produtos.map((p) => (
                    <li key={p} className="text-xs flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" /> {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-xl border bg-card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-sm">Quer um destes produtos?</p>
          <p className="text-xs text-muted-foreground">Fale com a Summo — estruturamos o entregável sob a sua necessidade.</p>
        </div>
        <Link href="/captacao" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy/90">
          Quero conversar <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function ClippingPreview() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch(`${API}/mi/clipping`).then(r => r.json()).then(setD).catch(() => {}); }, []);
  return (
    <div className="rounded-xl border-2 border-brand-navy/20 bg-gradient-to-br from-brand-navy/5 to-transparent p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">📰</span>
        <h3 className="font-bold text-sm">{d?.titulo ?? "Clipping Mineral Summo"}</h3>
        <Badge variant="outline" className="text-[9px]">Produto F · isca</Badge>
      </div>
      {!d ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {d.destaques?.map((x: any, i: number) => (
              <div key={i} className="rounded-lg bg-white border p-2.5">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{x.tipo}</div>
                <div className="text-sm font-bold text-brand-navy">
                  {x.unidade === "R$" ? fmtBRL(x.valor) : x.unidade === "US$" ? `US$ ${(x.valor/1e9).toFixed(1)} bi` : x.valor?.toLocaleString("pt-BR")}
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">{x.texto}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-2.5">
            <p className="text-[11px] text-muted-foreground">
              <strong>Manchetes do setor:</strong> {d.manchetes_status}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground/70 italic">
            Cada edição traz 1+ gráfico proprietário SQ (acima, dado real) — o gancho que gera lead. As manchetes externas plugam via N8N/Google Alerts.
          </p>
        </div>
      )}
    </div>
  );
}

function PreviewCard({ icon: Icon, titulo, produto, children }: { icon: React.ComponentType<{ className?: string }>; titulo: string; produto: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-brand-teal" />
            <h4 className="font-bold text-sm">{titulo}</h4>
          </div>
          <Badge variant="outline" className="text-[9px]">{produto}</Badge>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function PipelinePreview() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch(`${API}/mi/pipeline-projetos`).then(r => r.json()).then(setD).catch(() => {}); }, []);
  return (
    <PreviewCard icon={Factory} titulo="Pipeline de Projetos Minerários" produto="Anzol público">
      {!d ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
        <div className="space-y-1.5">
          <p className="text-2xl font-bold text-brand-navy">{d.total} <span className="text-xs font-normal text-muted-foreground">grandes projetos · US$ {(d.investimento_usd_anunciado/1e9).toFixed(1)} bi anunciados</span></p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(d.por_categoria).slice(0, 6).map(([k, n]: any) => (
              <Badge key={k} variant="secondary" className="text-[9px]">{k}: {n}</Badge>
            ))}
          </div>
        </div>
      )}
    </PreviewCard>
  );
}

function MonitorCfemPreview() {
  const [d, setD] = useState<any>(null);
  const [tri, setTri] = useState<any>(null);
  useEffect(() => {
    fetch(`${API}/mi/monitor-cfem?ano=2025&limit=4`).then(r => r.json()).then(setD).catch(() => {});
    fetch(`${API}/mi/monitor-cfem-trimestral?substancia=FERRO&trimestres=5`).then(r => r.json()).then(setTri).catch(() => {});
  }, []);
  return (
    <PreviewCard icon={TrendingUp} titulo="Monitor CFEM" produto="Produto B">
      {!d ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Arrecadação 2025: <strong className="text-foreground">{fmtBRL(d.total_recolhido)}</strong></p>
          {d.ranking?.slice(0, 4).map((r: any) => (
            <div key={r.substancia} className="flex justify-between text-xs">
              <span className="truncate">{r.substancia}</span>
              <span className="font-medium tabular-nums">{fmtBRL(r.valor_recolhido)}</span>
            </div>
          ))}
          {tri?.serie && (
            <div className="border-t pt-1.5 mt-1">
              <p className="text-[10px] text-muted-foreground mb-1">Ferro · trimestral (variação p/p)</p>
              <div className="flex items-end gap-1.5 flex-wrap">
                {tri.serie.map((s: any) => (
                  <span key={s.periodo} className="text-[10px]">
                    <span className="text-muted-foreground">{s.periodo}</span>{" "}
                    <span className={s.variacao_pct == null ? "text-muted-foreground" : s.variacao_pct >= 0 ? "text-green-600" : "text-red-600"}>
                      {s.variacao_pct == null ? "—" : `${s.variacao_pct >= 0 ? "▲" : "▼"}${Math.abs(s.variacao_pct)}%`}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PreviewCard>
  );
}

function RadarEstrategicosPreview() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch(`${API}/mi/radar-estrategicos`).then(r => r.json()).then(setD).catch(() => {}); }, []);
  return (
    <PreviewCard icon={Layers} titulo="Radar de Minerais Estratégicos" produto="Produto D">
      {!d ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground"><strong className="text-foreground">{d.total?.toLocaleString("pt-BR")}</strong> requerimentos em minerais críticos</p>
          {d.por_substancia?.slice(0, 5).map((r: any) => (
            <div key={r.substancia} className="flex justify-between text-xs">
              <span className="truncate">{r.substancia}</span>
              <span className="font-medium tabular-nums">{r.n.toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </PreviewCard>
  );
}

function AtlasFerroPreview() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch(`${API}/mi/atlas-ferro?limit=5`).then(r => r.json()).then(setD).catch(() => {}); }, []);
  return (
    <PreviewCard icon={Anchor} titulo="Atlas DR-Grade (proto · ferro)" produto="Produto A">
      {!d ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Municípios produtores de ferro · CFEM desde 2023</p>
          {d.ranking?.slice(0, 5).map((r: any) => (
            <div key={r.municipio + r.uf} className="flex justify-between text-xs">
              <span className="truncate">{r.municipio}/{r.uf}</span>
              <span className="font-medium tabular-nums">{fmtBRL(r.valor_recolhido)}</span>
            </div>
          ))}
        </div>
      )}
    </PreviewCard>
  );
}
