"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCheck,
  GitBranch,
  ListTodo,
  Network,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatrizRiscos } from "@/components/riscos/matriz-riscos";
import {
  CLASSIFICACAO_COLOR,
  CLASSIFICACAO_LABEL,
  CLASSIFICACAO_ORDER,
  fetchAlertasGlobal,
  fetchDashboardKpis,
  fetchMatrizRiscos,
  fetchMetodologiaAtiva,
  importarMusa,
  type AlertasGlobal,
  type Classificacao,
  type DashboardKpis,
  type MatrizCellComRiscos,
  type Metodologia,
} from "@/lib/riscos-api";
import {
  fetchAppetiteDashboard,
  fetchKRIDashboard,
  type AppetiteDashboard,
  type KRIsDashboard,
} from "@/lib/monitoramento-api";

export default function GestaoRiscosPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [metodologia, setMetodologia] = useState<Metodologia | null>(null);
  const [celulas, setCelulas] = useState<MatrizCellComRiscos[]>([]);
  const [base, setBase] = useState<"pura" | "residual">("residual");
  const [catImpacto, setCatImpacto] = useState<string>("pessoal");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [alertas, setAlertas] = useState<AlertasGlobal | null>(null);
  const [kriDash, setKriDash] = useState<KRIsDashboard | null>(null);
  const [appetiteDash, setAppetiteDash] = useState<AppetiteDashboard | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [k, m, mat, al, kd, ad] = await Promise.all([
          fetchDashboardKpis(),
          fetchMetodologiaAtiva(),
          fetchMatrizRiscos(base),
          fetchAlertasGlobal(),
          fetchKRIDashboard().catch(() => null),
          fetchAppetiteDashboard().catch(() => null),
        ]);
        if (!mounted) return;
        setKpis(k);
        setMetodologia(m);
        setCelulas(mat);
        setAlertas(al);
        setKriDash(kd);
        setAppetiteDash(ad);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [base]);

  const cats =
    metodologia?.impacto
      .map((i) => i.categoria)
      .filter((v, idx, arr) => arr.indexOf(v) === idx) ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão de Riscos e Crises</h1>
          <p className="text-sm text-muted-foreground">
            Ciclo ISO 31000 — identificação, análise, avaliação, tratamento e monitoramento.
            {metodologia ? ` Metodologia ativa: ${metodologia.nome}.` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={base} onValueChange={(v) => setBase(v as "pura" | "residual")}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="residual">Risco residual</SelectItem>
              <SelectItem value="pura">Risco puro</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={importing}
            onClick={async () => {
              setImporting(true);
              setImportMsg(null);
              try {
                const stats = await importarMusa();
                setImportMsg(
                  `Exemplo carregado: +${stats.riscos} riscos, +${stats.bowties} bowties, +${stats.causas} causas`,
                );
                const [k, mat] = await Promise.all([
                  fetchDashboardKpis(),
                  fetchMatrizRiscos(base),
                ]);
                setKpis(k);
                setCelulas(mat);
              } catch (e) {
                setImportMsg(e instanceof Error ? e.message : "Erro ao importar");
              } finally {
                setImporting(false);
              }
            }}
          >
            {importing ? "Importando…" : "Carregar exemplo"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.open(
                `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/riscos/exportar-executivo-pdf`,
                "_blank",
              );
            }}
          >
            ⬇ Relatório Executivo PDF
          </Button>
          <Button asChild>
            <Link href="/gestao-riscos/riscos/novo">+ Novo risco</Link>
          </Button>
        </div>
      </header>
      {importMsg && <p className="text-xs text-muted-foreground">{importMsg}</p>}

      {(kriDash?.status_count.vermelho ?? 0) > 0 ||
      (appetiteDash?.riscos_em_breach_total ?? 0) > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(kriDash?.status_count.vermelho ?? 0) > 0 && (
            <Card className="border-red-500/60 bg-red-500/5">
              <CardContent className="flex items-start gap-3 py-3">
                <div className="text-xl">📉</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-red-700">
                    KRIs em vermelho
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {kriDash!.status_count.vermelho} indicador(es) excederam o
                    threshold vermelho ·{" "}
                    {kriDash!.status_count.amarelo ?? 0} em amarelo.
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {kriDash!.vermelhos.slice(0, 5).map((k) => (
                      <Link
                        key={k.id}
                        href={`/gestao-riscos/kris/${k.id}`}
                        className="inline-flex items-center rounded bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:brightness-110"
                      >
                        {k.codigo}
                      </Link>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/gestao-riscos/kris">Ver todos</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {(appetiteDash?.riscos_em_breach_total ?? 0) > 0 && (
            <Card className="border-red-500/60 bg-red-500/5">
              <CardContent className="flex items-start gap-3 py-3">
                <div className="text-xl">⚖️</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-red-700">
                    Apetite excedido
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {appetiteDash!.riscos_em_breach_total} risco(s) violam a
                    tolerância declarada em{" "}
                    {appetiteDash!.apetites.filter((a) => a.em_breach > 0).length}{" "}
                    categoria(s).
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/gestao-riscos/apetite">Ver detalhes</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {alertas &&
        (alertas.total_causas_criticas_sem_tratamento > 0 ||
          alertas.total_consequencias_criticas_sem_tratamento > 0) && (
          <Card className="border-red-500/60 bg-red-500/5">
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <div className="text-2xl">⚠</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-700">
                  Críticos sem tratamento
                </div>
                <p className="text-xs text-muted-foreground">
                  {alertas.total_causas_criticas_sem_tratamento} causa(s) crítica(s) sem
                  controle preventivo nem ação ·{" "}
                  {alertas.total_consequencias_criticas_sem_tratamento} consequência(s)
                  crítica(s) sem controle corretivo nem ação (de{" "}
                  {alertas.total_causas_criticas +
                    alertas.total_consequencias_criticas}{" "}
                  itens marcados como críticos)
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {alertas.riscos_com_alerta.slice(0, 4).map((r) => (
                  <Link
                    key={r.risco_id}
                    href={`/gestao-riscos/bowtie/${r.risco_id}`}
                    className="inline-flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                  >
                    {r.codigo}
                  </Link>
                ))}
                {alertas.riscos_com_alerta.length > 4 && (
                  <span className="inline-flex items-center rounded bg-muted px-2 py-1 text-[11px]">
                    +{alertas.riscos_com_alerta.length - 4}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<ShieldAlert className="h-4 w-4" />}
          label="Riscos cadastrados"
          value={kpis?.total_riscos ?? 0}
          href="/gestao-riscos/riscos"
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Críticos (residual)"
          value={kpis?.por_classificacao_residual?.C ?? 0}
          accent={CLASSIFICACAO_COLOR.C}
        />
        <KpiCard
          icon={<ListTodo className="h-4 w-4" />}
          label="Ações atrasadas"
          value={kpis?.acoes_atrasadas ?? 0}
          accent="#dc2626"
          href="/gestao-riscos/planos/acoes"
        />
        <KpiCard
          icon={<CheckCheck className="h-4 w-4" />}
          label="Controles em monitoramento"
          value={kpis?.controles_total ?? 0}
          href="/gestao-riscos/planos/controles"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Matriz de Riscos 5×5</CardTitle>
            <p className="text-sm text-muted-foreground">
              Probabilidade × Impacto — base {base === "pura" ? "pura" : "residual"}. Clique num
              código do risco para abrir o detalhe.
            </p>
          </div>
          {cats.length > 1 && (
            <Select value={catImpacto} onValueChange={setCatImpacto}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cats.map((c) => (
                  <SelectItem key={c} value={c}>
                    Impacto — {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {loading || !metodologia ? (
            <p className="text-sm text-muted-foreground">Carregando matriz…</p>
          ) : (
            <MatrizRiscos
              celulas={celulas}
              escalaProb={metodologia.probabilidade}
              escalaImpacto={metodologia.impacto}
              impactoCategoria={catImpacto}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DistribuicaoCard
          titulo="Por classificação (residual)"
          distribuicao={kpis?.por_classificacao_residual ?? {}}
          total={kpis?.total_riscos ?? 0}
          ordem={CLASSIFICACAO_ORDER}
          colorFn={(k) => CLASSIFICACAO_COLOR[k as Classificacao] ?? "#64748b"}
          labelFn={(k) => CLASSIFICACAO_LABEL[k as Classificacao] ?? k}
        />
        <DistribuicaoCard
          titulo="Por estágio"
          distribuicao={kpis?.por_estagio ?? {}}
          total={kpis?.total_riscos ?? 0}
          colorFn={() => "#0ea5e9"}
          labelFn={(k) => k}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximas visões</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <NavShortcut href="/gestao-riscos/riscos" icon={<AlertTriangle />} label="Riscos" />
          <NavShortcut
            href="/gestao-riscos/bowtie"
            icon={<GitBranch />}
            label="Bowtie"
            hint="em breve"
          />
          <NavShortcut
            href="/gestao-riscos/organograma"
            icon={<Network />}
            label="Organograma"
            hint="em breve"
          />
          <NavShortcut
            href="/gestao-riscos/cadeia-valor"
            icon={<Workflow />}
            label="Cadeia de valor"
            hint="em breve"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <Card className="h-full">
      <CardContent className="flex items-center gap-3 py-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: accent ?? "#0f766e" }}
        >
          {icon}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function DistribuicaoCard({
  titulo,
  distribuicao,
  total,
  ordem,
  colorFn,
  labelFn,
}: {
  titulo: string;
  distribuicao: Record<string, number>;
  total: number;
  ordem?: string[];
  colorFn: (key: string) => string;
  labelFn: (key: string) => string;
}) {
  const entries = Object.entries(distribuicao);
  const sorted = ordem
    ? [...entries].sort(
        (a, b) => (ordem.indexOf(a[0]) + 1000) - (ordem.indexOf(b[0]) + 1000),
      )
    : entries.sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados</p>
        ) : (
          sorted.map(([k, v]) => {
            const pct = total > 0 ? Math.round((v / total) * 100) : 0;
            const color = colorFn(k);
            return (
              <div key={k}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{labelFn(k)}</span>
                  <span className="text-muted-foreground">
                    {v} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded bg-muted">
                  <div
                    className="h-2 rounded"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function NavShortcut({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center rounded border border-border bg-card p-3 text-center transition hover:border-primary/50"
    >
      <div className="mb-1 text-primary">{icon}</div>
      <div className="text-sm font-medium">{label}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </Link>
  );
}
