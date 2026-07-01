"use client";

/**
 * Cards de destaque da home, configuráveis por usuário.
 * Padrão por pessoa (ex.: Rodrigo = MUSA + Evolução), mas cada um escolhe os seus
 * e a escolha persiste no navegador (localStorage).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert, GitBranch, Cpu, ShieldCheck, TrendingUp, Map, Briefcase,
  Target, ListTodo, ArrowRight, Settings2, Check, BookOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Opt = { key: string; titulo: string; desc: string; href: string; icon: React.ComponentType<{ className?: string }>; cor: string };

const OPCOES: Opt[] = [
  { key: "musa", titulo: "Projeto MUSA", desc: "Riscos, ações e acompanhamento do MUSA", href: "/gestao-riscos", icon: ShieldAlert, cor: "#7B1FA2" },
  { key: "evolucao", titulo: "Evolução do Sistema", desc: "Plano, sprints e sugestões", href: "/evolucao", icon: GitBranch, cor: "#0A2540" },
  { key: "sq_solucoes", titulo: "SQ Soluções", desc: "Pipeline, implantações e frota", href: "/sq-solutions", icon: Cpu, cor: "#E67E22" },
  { key: "sq_ambiental", titulo: "SQ Ambiental", desc: "Radar de condicionantes e diligência", href: "/condicionantes", icon: ShieldCheck, cor: "#156082" },
  { key: "mineral_intelligence", titulo: "Inteligência de Mercado", desc: "Produtos e dados de mercado", href: "/inteligencia-comercial", icon: TrendingUp, cor: "#FFC000" },
  { key: "ativos", titulo: "Ativos Minerários", desc: "Mapa, trilha e prospecção", href: "/direitos", icon: Map, cor: "#0E7490" },
  { key: "consultoria", titulo: "SQ Consultoria", desc: "Carteira de clientes e Régua", href: "/sq-consultoria", icon: Briefcase, cor: "#0A2540" },
  { key: "captacao", titulo: "Captação", desc: "Inbox de demandas e funis", href: "/captacao", icon: Target, cor: "#FFC000" },
  { key: "planos", titulo: "Plano de Ações", desc: "Kanban, EAP e cronograma", href: "/planos-de-acao", icon: ListTodo, cor: "#156082" },
  { key: "guia_ambiental", titulo: "Novidades & Manual (Ambiental)", desc: "O que mudou, roteiro de teste e proposta Jaguar", href: "/guias/ambiental-diligencia-giulia.html", icon: BookOpen, cor: "#E67E22" },
];

const OPT_MAP = Object.fromEntries(OPCOES.map((o) => [o.key, o]));

// Padrão por primeiro nome (sem acento, minúsculo)
const DEFAULT_BY_NAME: Record<string, string[]> = {
  rodrigo: ["musa", "evolucao"],
  bernardo: ["sq_solucoes", "evolucao"],
  giulia: ["guia_ambiental", "sq_ambiental", "evolucao"],
  lima: ["mineral_intelligence", "evolucao"],
  mateus: ["mineral_intelligence", "evolucao"],
  leo: ["consultoria", "evolucao"],
  leonardo: ["consultoria", "evolucao"],
  maury: ["ativos", "evolucao"],
};

function firstName(nome: string): string {
  return (nome || "").trim().split(/\s+/)[0].toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function HomeDestaques({ nome }: { nome: string }) {
  const fn = firstName(nome);
  const storageKey = `home_destaques_${fn}`;
  const [sel, setSel] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    let inicial: string[] | null = null;
    try {
      const s = localStorage.getItem(storageKey);
      if (s) inicial = JSON.parse(s);
    } catch {}
    if (!inicial) inicial = DEFAULT_BY_NAME[fn] ?? ["evolucao", "planos"];
    setSel(inicial.filter((k) => OPT_MAP[k]));
  }, [storageKey, fn]);

  function salvar() {
    setSel(draft);
    try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch {}
    setOpen(false);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-base font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-brand-gold" /> Seus destaques
        </h2>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setDraft(sel); setOpen(true); }}>
          <Settings2 className="h-3.5 w-3.5 mr-1" /> Personalizar
        </Button>
      </div>

      {sel.length === 0 ? (
        <Card><CardContent className="p-5 text-center text-sm text-muted-foreground">
          Nenhum destaque escolhido. Clique em "Personalizar".
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sel.map((k) => {
            const o = OPT_MAP[k]; if (!o) return null;
            const Icon = o.icon;
            const externo = o.href.startsWith("http") || o.href.endsWith(".html");
            const inner = (
              <Card className="border-2 transition-all hover:shadow-md" style={{ borderColor: `${o.cor}33` }}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl p-3 shrink-0" style={{ background: `${o.cor}1a` }}>
                    <Icon className="h-7 w-7" style={{ color: o.cor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-base font-bold group-hover:opacity-80">{o.titulo}</h3>
                    <p className="text-xs text-muted-foreground">{o.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            );
            return externo ? (
              <a key={k} href={o.href} target="_blank" rel="noreferrer" className="group block">{inner}</a>
            ) : (
              <Link key={k} href={o.href} className="group block">{inner}</Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Personalizar destaques</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1 mb-1">Escolha os atalhos que aparecem no seu início.</p>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {OPCOES.map((o) => {
              const on = draft.includes(o.key);
              return (
                <button key={o.key} onClick={() => setDraft((d) => on ? d.filter((x) => x !== o.key) : [...d, o.key])}
                  className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${on ? "border-brand-teal/50 bg-brand-teal/5" : "hover:bg-muted/40"}`}>
                  <o.icon className="h-4 w-4 shrink-0" style={{ color: o.cor }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{o.titulo}</div>
                    <div className="text-[11px] text-muted-foreground">{o.desc}</div>
                  </div>
                  {on && <Check className="h-4 w-4 text-brand-teal shrink-0" />}
                </button>
              );
            })}
          </div>
          <Button onClick={salvar} className="w-full bg-brand-navy text-white hover:bg-brand-navy/90">Salvar destaques</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
