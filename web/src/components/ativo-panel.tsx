"use client";

/**
 * Painel único do Ativo Minerário — a "porta" que se abre a partir do mapa,
 * da prospecção ou do portfólio. Mostra identidade + trilha (ciclo de vida) +
 * portfólio do titular + ações, com gating progressivo por nível de acesso
 * (a tabela validada na Onda B):
 *
 *   Anônimo  → identidade básica
 *   Logado   → + trilha visual e a REGRA de prazo (isca freemium)
 *   Premium  → + countdown real, portfólio do titular
 *   Interno  → + ações (promover ao Funil, etc.)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, MapPin, User2, Mountain, Building2, Route, CalendarClock,
  CheckCircle2, Circle, Lock, ArrowRight, ExternalLink, Layers,
  Droplets, Zap, Truck, Anchor,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffectiveRole } from "@/hooks/use-effective-role";
import { hasMinRole } from "@/lib/roles";
import { ativosApi, type AtivoDetail, type PromoverResult, type AtivoContexto } from "@/lib/ativos-api";

export function AtivoPanel({
  processo,
  open,
  onClose,
}: {
  processo: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const roleState = useEffectiveRole();
  const role = roleState.status === "authenticated" ? roleState.role : undefined;
  const isLogado = roleState.status === "authenticated";
  const isPago = hasMinRole(role, "visitante_pago");
  const isInterno = hasMinRole(role, "consultor");

  const meuNome = roleState.status === "authenticated" ? roleState.nome : undefined;

  const [data, setData] = useState<AtivoDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [promovendo, setPromovendo] = useState(false);
  const [promovido, setPromovido] = useState<PromoverResult | null>(null);
  const [contexto, setContexto] = useState<AtivoContexto | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);

  useEffect(() => {
    if (!open || !processo) return;
    setLoading(true);
    setErro(null);
    setData(null);
    setPromovido(null);
    setContexto(null);
    ativosApi
      .detail(processo)
      .then(setData)
      .catch((e) => setErro(e.message ?? "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [open, processo]);

  // Contexto territorial (camadas cruzadas) — só premium+, sob demanda.
  useEffect(() => {
    if (!data?.identidade.processo_norm || !isPago) return;
    setCtxLoading(true);
    ativosApi
      .contexto(data.identidade.processo_norm)
      .then(setContexto)
      .catch(() => setContexto(null))
      .finally(() => setCtxLoading(false));
  }, [data, isPago]);

  async function promover() {
    if (!data?.identidade.processo_norm) return;
    setPromovendo(true);
    try {
      const r = await ativosApi.promover(data.identidade.processo_norm, meuNome);
      setPromovido(r);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao promover");
    } finally {
      setPromovendo(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-base">
            {data?.identidade.processo_norm ?? processo ?? "Ativo"}
          </SheetTitle>
          <SheetDescription>
            {data?.identidade.titular ?? "Ativo minerário"}
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
          </div>
        )}
        {erro && <p className="px-4 text-sm text-destructive">{erro}</p>}

        {data && (
          <div className="space-y-6 px-1 pb-8">
            {/* ── Identidade (todos) ── */}
            <section className="space-y-2">
              <IdRow icon={User2} label="Titular" value={data.identidade.titular} />
              <IdRow icon={Mountain} label="Substância" value={data.identidade.substancia} />
              <IdRow icon={MapPin} label="Município" value={data.identidade.municipio} />
              <IdRow icon={Layers} label="Fase ANM" value={data.identidade.fase_atual} />
              {data.identidade.area_ha != null && (
                <IdRow icon={Layers} label="Área" value={`${Number(data.identidade.area_ha).toLocaleString("pt-BR")} ha`} />
              )}
            </section>

            {/* ── Trilha do Ativo ── */}
            <section>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-brand-navy mb-3">
                <Route className="h-4 w-4" /> Trilha do Ativo
              </h3>

              {isLogado ? (
                <Trilha data={data} mostrarCountdown={isPago} />
              ) : (
                <GateBox
                  texto="Entre na sua conta para ver em que etapa do ciclo de vida este ativo está e quais prazos legais se aplicam."
                  cta="Criar conta / Entrar"
                  href="/login"
                />
              )}
            </section>

            {/* ── Portfólio do titular ── */}
            {data.portfolio && data.portfolio.outros_direitos > 0 && (
              <section>
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-brand-navy mb-2">
                  <Building2 className="h-4 w-4" /> Portfólio do titular
                </h3>
                {isPago ? (
                  <Link
                    href={`/direitos/portfolio?cnpj=${encodeURIComponent(data.portfolio.cpf_cnpj)}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:border-brand-teal/50 hover:bg-muted/30 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold">{data.portfolio.total_direitos.toLocaleString("pt-BR")} direitos no nome deste titular</p>
                      <p className="text-xs text-muted-foreground">Ver carteira completa por CNPJ</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-brand-teal group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ) : (
                  <GateBox
                    texto={`Este titular tem ${data.portfolio.total_direitos.toLocaleString("pt-BR")} direitos. O portfólio completo por CNPJ é um recurso Premium.`}
                    cta="Conhecer o Premium"
                    href="/inteligencia-comercial"
                  />
                )}
              </section>
            )}

            {/* ── Contexto territorial (camadas cruzadas) ── */}
            <section>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-brand-navy mb-2">
                <Layers className="h-4 w-4" /> Contexto territorial
              </h3>
              {isPago ? (
                ctxLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando distâncias…
                  </div>
                ) : contexto && Object.keys(contexto.camadas).length > 0 ? (
                  <div className="space-y-2">
                    {contexto.camadas.agua && <CamadaRow icon={Droplets} label="Água" c={contexto.camadas.agua} />}
                    {contexto.camadas.energia && <CamadaRow icon={Zap} label="Energia" c={contexto.camadas.energia} />}
                    {contexto.camadas.logistica && <CamadaRow icon={Truck} label="Logística" c={contexto.camadas.logistica} />}
                    {contexto.camadas.destinacao && <CamadaRow icon={Anchor} label="Destinação" c={contexto.camadas.destinacao} />}
                    {contexto.camadas.geologico && <CamadaRow icon={Mountain} label="Geologia" c={contexto.camadas.geologico} />}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem contexto disponível para este ativo.</p>
                )
              ) : (
                <GateBox
                  texto="Distâncias a água, energia e logística (cruzamento espacial com as bases públicas) é um recurso Premium."
                  cta="Conhecer o Premium"
                  href="/inteligencia-comercial"
                />
              )}
            </section>

            {/* ── Ações internas ── */}
            {isInterno && (
              <section className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-bold text-brand-navy">Ações</h3>
                <div className="grid grid-cols-1 gap-2">
                  {promovido ? (
                    <Link
                      href="/oportunidades"
                      className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs text-success-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {promovido.criado ? "Promovido ao Funil" : "Já estava no Funil"} — abrir oportunidade →
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" className="justify-start" onClick={promover} disabled={promovendo}>
                      {promovendo ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5 mr-2" />}
                      Promover ao Funil
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm" className="justify-start">
                    <Link href={`/concessoes?search=${encodeURIComponent(data.identidade.processo_norm ?? "")}`}>
                      <Layers className="h-3.5 w-3.5 mr-2" /> Ver registro completo
                    </Link>
                  </Button>
                </div>
              </section>
            )}

            {/* Fonte */}
            <a
              href={data.scm_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-brand-teal"
            >
              <ExternalLink className="h-3 w-3" /> Consultar no SCM/ANM
            </a>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Trilha({ data, mostrarCountdown }: { data: AtivoDetail; mostrarCountdown: boolean }) {
  const t = data.trilha;
  return (
    <div className="space-y-4">
      {t.regime_especial && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-xs text-violet-800">
          <strong>Regime especial:</strong> {t.regime_especial}. A trilha ordinária pesquisa→lavra serve de referência.
        </div>
      )}

      {/* Stepper vertical */}
      <ol className="relative space-y-3">
        {t.etapas.map((e, i) => {
          const isAtual = e.status === "atual";
          const isDone = e.status === "concluida";
          return (
            <li key={e.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : isAtual ? (
                  <div className="h-5 w-5 rounded-full bg-brand-teal flex items-center justify-center shrink-0">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                )}
                {i < t.etapas.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[14px] ${isDone ? "bg-success/40" : "bg-muted-foreground/15"}`} />
                )}
              </div>
              <div className={`pb-1 ${isAtual ? "" : "opacity-70"}`}>
                <p className={`text-sm leading-tight ${isAtual ? "font-bold text-brand-teal" : isDone ? "font-medium" : ""}`}>
                  {e.label}
                </p>
                {isAtual && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{e.descricao}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Prazos aplicáveis (a REGRA) */}
      {t.prazos.length > 0 && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <CalendarClock className="h-3.5 w-3.5 text-brand-orange" /> Prazos aplicáveis nesta etapa
          </p>
          {mostrarCountdown && t.countdown && (
            <div className="rounded bg-brand-orange/10 px-2 py-1.5 text-xs">
              <strong>{t.countdown.dias_restantes >= 0 ? `Vence em ${t.countdown.dias_restantes} dias` : `Vencido há ${Math.abs(t.countdown.dias_restantes)} dias`}</strong>
              {" "}({new Date(t.countdown.vencimento).toLocaleDateString("pt-BR")})
            </div>
          )}
          <ul className="space-y-1.5">
            {t.prazos.map((p, i) => (
              <li key={i} className="text-[11px]">
                <span className="font-medium">{p.evento}</span>
                {p.recorrente && <Badge variant="secondary" className="ml-1 text-[8px]">recorrente</Badge>}
                <span className="text-muted-foreground"> — {p.prazo}</span>
                {p.proximo && (
                  <span className="block text-brand-orange font-medium">
                    Próximo: {new Date(p.proximo).toLocaleDateString("pt-BR")}
                    {typeof p.dias_restantes === "number" && ` (em ${p.dias_restantes} dias)`}
                  </span>
                )}
                <span className="block text-muted-foreground/70">base: {p.base} · {p.fonte}</span>
              </li>
            ))}
          </ul>
          {!mostrarCountdown && (
            <p className="text-[10px] text-muted-foreground/70 border-t pt-1.5">
              A contagem regressiva exata (data de vencimento) é um recurso Premium.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CamadaRow({ icon: Icon, label, c }: { icon: React.ComponentType<{ className?: string }>; label: string; c: { score: number; evidencia: string; confianca: string } }) {
  const cor = c.score >= 4 ? "text-success" : c.score >= 2 ? "text-warning" : "text-muted-foreground";
  return (
    <div className="flex items-start gap-2 text-xs rounded-lg border p-2">
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium">{label}</span>
          {c.score > 0 && <span className={`text-[10px] font-semibold ${cor}`}>{c.score}/5</span>}
        </div>
        <p className="text-[11px] text-muted-foreground">{c.evidencia}</p>
      </div>
    </div>
  );
}

function IdRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="font-medium flex-1">{value}</span>
    </div>
  );
}

function GateBox({ texto, cta, href }: { texto: string; cta: string; href: string }) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3 space-y-2">
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {texto}
      </p>
      <Button asChild size="sm" variant="outline" className="w-full">
        <Link href={href}>{cta} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
      </Button>
    </div>
  );
}
