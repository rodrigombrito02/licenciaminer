"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2, Loader2, Search, Mountain, Layers, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModuleHero } from "@/components/module-hero";
import { RoleGate } from "@/components/role-gate";
import { AtivoPanel } from "@/components/ativo-panel";
import { ativosApi, type Portfolio } from "@/lib/ativos-api";

export default function PortfolioPage() {
  return (
    <RoleGate
      minRole="visitante_pago"
      fallback={
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Building2 className="h-10 w-10 text-brand-teal mx-auto" />
            <h3 className="font-bold">Recurso Premium</h3>
            <p className="text-sm text-muted-foreground">
              O portfólio por titular (agrupamento de todos os direitos de um CNPJ) é um recurso Premium.
            </p>
            <Button asChild className="mt-2"><Link href="/inteligencia-comercial">Conhecer o Premium</Link></Button>
          </CardContent>
        </Card>
      }
    >
      <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-brand-teal" /></div>}>
        <PortfolioInner />
      </Suspense>
    </RoleGate>
  );
}

function PortfolioInner() {
  const params = useSearchParams();
  const cnpjParam = params.get("cnpj") ?? "";

  const [cnpj, setCnpj] = useState(cnpjParam);
  const [data, setData] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ativoProcesso, setAtivoProcesso] = useState<string | null>(null);

  async function carregar(c: string) {
    const digits = c.replace(/\D/g, "");
    if (digits.length < 11) {
      setErro("Informe um CNPJ/CPF válido");
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      setData(await ativosApi.portfolio(digits));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (cnpjParam) carregar(cnpjParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpjParam]);

  return (
    <div className="space-y-6">
      <ModuleHero
        icon={Building2}
        badge="Ativos Minerários · Portfólio"
        title="Portfólio por titular"
        description="Todos os direitos minerários agrupados por CNPJ/CPF — quem concentra ativos, em que fases e substâncias."
        variant="teal"
      />

      <Link href="/direitos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-teal">
        <ArrowLeft className="h-3 w-3" /> Voltar para Ativos Minerários
      </Link>

      {/* Busca */}
      <div className="flex gap-2">
        <Input
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          placeholder="CNPJ ou CPF do titular"
          onKeyDown={(e) => e.key === "Enter" && carregar(cnpj)}
        />
        <Button onClick={() => carregar(cnpj)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {data && (
        <div className="space-y-5">
          {/* Cabeçalho do titular */}
          <Card>
            <CardContent className="p-4">
              <h2 className="font-bold text-lg">{data.titular ?? "Titular"}</h2>
              <p className="text-sm text-muted-foreground font-mono">{data.cpf_cnpj}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge className="bg-brand-teal/15 text-brand-teal border-brand-teal/30">
                  {data.total_direitos.toLocaleString("pt-BR")} direitos
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Agregados */}
          <div className="grid md:grid-cols-2 gap-4">
            <AggCard titulo="Por fase" icon={Layers} dados={data.por_fase} />
            <AggCard titulo="Por substância" icon={Mountain} dados={data.por_substancia} limite={8} />
          </div>

          {/* Lista de direitos */}
          <div>
            <h3 className="font-bold text-sm mb-2">Direitos ({data.direitos.length}{data.direitos.length < data.total_direitos ? ` de ${data.total_direitos}` : ""})</h3>
            <div className="space-y-1.5">
              {data.direitos.map((d) => (
                <button
                  key={d.processo_norm ?? d.processo}
                  onClick={() => setAtivoProcesso(d.processo_norm ?? d.processo)}
                  className="w-full text-left flex items-center gap-3 rounded-lg border p-2.5 hover:border-brand-teal/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-mono text-xs w-28 shrink-0">{d.processo_norm}</span>
                  <span className="text-xs flex-1 min-w-0 truncate">{d.substancia_principal ?? "—"}</span>
                  <span className="text-[11px] text-muted-foreground hidden sm:block truncate max-w-[160px]">{d.municipio_principal}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">{d.fase_atual}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <AtivoPanel
        processo={ativoProcesso}
        open={ativoProcesso !== null}
        onClose={() => setAtivoProcesso(null)}
      />
    </div>
  );
}

function AggCard({
  titulo, icon: Icon, dados, limite = 12,
}: {
  titulo: string;
  icon: React.ComponentType<{ className?: string }>;
  dados: Record<string, number>;
  limite?: number;
}) {
  const entries = Object.entries(dados).slice(0, limite);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-brand-navy">
          <Icon className="h-4 w-4" /> {titulo}
        </h3>
        <div className="space-y-1.5">
          {entries.map(([k, n]) => (
            <div key={k} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="truncate max-w-[200px]">{k}</span>
                <span className="font-medium tabular-nums">{n.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-brand-teal/60" style={{ width: `${(n / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
