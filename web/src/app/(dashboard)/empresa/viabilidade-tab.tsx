"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  XCircle,
  Archive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAtividades,
  fetchRegionais,
  fetchConsultaViabilidade,
  type ViabilidadeResponse,
} from "@/lib/api";
import { fmtBR, fmtPct } from "@/lib/format";
import { EmpresaDossier } from "./dossier";

const ATIVIDADE_LABELS: Record<string, string> = {
  "A-01": "Pesquisa Mineral",
  "A-02": "Lavra",
  "A-03": "Beneficiamento",
  "A-04": "Pilha de Estéril",
  "A-05": "Barragem",
  "A-06": "Transporte",
  "A-07": "Infraestrutura",
};

export function ViabilidadeTab() {
  const [atividades, setAtividades] = useState<string[]>([]);
  const [regionais, setRegionais] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form state
  const [atividade, setAtividade] = useState("");
  const [classe, setClasse] = useState("");
  const [regional, setRegional] = useState("");
  const [cnpjInput, setCnpjInput] = useState("");

  // Results
  const [data, setData] = useState<ViabilidadeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAtividades(), fetchRegionais()])
      .then(([ativs, regs]) => {
        setAtividades(ativs);
        setRegionais(regs);
        if (ativs.length > 0) setAtividade(ativs[0]);
      })
      .catch((e) => { console.error("viabilidade options:", e); })
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleSearch = () => {
    if (!atividade) return;
    setLoading(true);
    setError(null);
    fetchConsultaViabilidade({
      atividade,
      classe: classe ? Number(classe) : undefined,
      regional: regional || undefined,
    })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const cnpjClean = cnpjInput.replace(/\D/g, "");
  const showCnpjDossier = cnpjClean.length === 14;

  const applyExample = (ex: { atividade: string; classe: string; regional: string }) => {
    setAtividade(ex.atividade);
    setClasse(ex.classe);
    setRegional(ex.regional);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Avalie a viabilidade de um projeto minerário com base no histórico de decisões da SEMAD.
        Selecione atividade, classe e regional para ver taxas de aprovação e casos similares.
      </p>

      {/* Filter form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Row 1: Atividade (full width — long labels) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Atividade
            </label>
            {loadingOptions ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={atividade} onValueChange={setAtividade}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma atividade" />
                </SelectTrigger>
                <SelectContent>
                  {atividades.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a} {ATIVIDADE_LABELS[a.slice(0, 4)] ? `— ${ATIVIDADE_LABELS[a.slice(0, 4)]}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Row 2: Classe + Regional side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Classe
              </label>
              <Select value={classe || "all"} onValueChange={(v) => setClasse(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      Classe {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                1 = menor impacto · 6 = maior impacto (DN COPAM 217/2017)
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Regional
              </label>
              {loadingOptions ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={regional || "all"} onValueChange={(v) => setRegional(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {regionais.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r.replace("Unidade Regional de Regularização Ambiental ", "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Row 3: CNPJ + Consultar */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px] max-w-xs">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                CNPJ (opcional)
              </label>
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpjInput}
                onChange={(e) => setCnpjInput(e.target.value)}
              />
            </div>
            <Button onClick={handleSearch} disabled={!atividade || loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Consultar
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="p-4 text-sm text-destructive">
            Erro: {error}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {data && (
        <>
          {/* Stats section */}
          <ViabilidadeStats data={data} />

          {/* Similar cases */}
          <CasosSimilares casos={data.casos_similares} />

          {/* Company profile if CNPJ provided */}
          {showCnpjDossier && (
            <>
              <Separator />
              <div>
                <h3 className="mb-4 font-heading text-lg font-semibold">
                  Perfil da Empresa
                </h3>
                <EmpresaDossier cnpj={cnpjClean} />
              </div>
            </>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <FileText className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-sm text-muted-foreground">
            Selecione os parâmetros acima e clique em Consultar
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            A análise compara seu perfil contra o histórico de decisões da SEMAD
          </p>
          {atividades.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 text-center">
                Exemplos para começar
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: "Lavra · Classe 3", prefix: "A-02", classe: "3" },
                  { label: "Beneficiamento · Classe 2", prefix: "A-03", classe: "2" },
                  { label: "Barragem · Classe 6", prefix: "A-05", classe: "6" },
                ].map((ex) => {
                  const atv = atividades.find(a => a.startsWith(ex.prefix));
                  if (!atv) return null;
                  return (
                    <button
                      key={ex.label}
                      onClick={() => { applyExample({ atividade: atv, classe: ex.classe, regional: "" }); }}
                      className="rounded-md border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                    >
                      {ex.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/40 text-center">
                Clique em um exemplo para preencher os filtros, depois clique Consultar
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ViabilidadeStats({ data }: { data: ViabilidadeResponse }) {
  const { stats, media_geral } = data;
  const diff = stats.taxa_aprovacao - media_geral;
  const direction = diff > 0 ? "acima" : "abaixo";

  const rateColor =
    stats.taxa_aprovacao >= 70
      ? "text-success"
      : stats.taxa_aprovacao >= 50
        ? "text-warning"
        : "text-danger";

  const barColor =
    stats.taxa_aprovacao >= 70
      ? "bg-success"
      : stats.taxa_aprovacao >= 50
        ? "bg-warning"
        : "bg-danger";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">
          Contexto Estatístico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum registro encontrado para esses parâmetros. Tente relaxar os filtros.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-6">
              {/* Donut-style rate display */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-muted">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={`${stats.taxa_aprovacao * 2.89} ${289 - stats.taxa_aprovacao * 2.89}`}
                      className={rateColor}
                    />
                  </svg>
                  <span className={`font-heading text-xl font-bold ${rateColor}`}>
                    {fmtPct(stats.taxa_aprovacao)}
                  </span>
                </div>
                <span className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Taxa de Aprovação
                </span>
              </div>

              {/* Metrics */}
              <div className="grid flex-1 grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Decisões Analisadas</p>
                  <p className="font-heading text-2xl font-bold tabular-nums">
                    {fmtBR(stats.total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deferidos / Indeferidos</p>
                  <p className="font-heading text-2xl font-bold tabular-nums">
                    {stats.deferidos} / {stats.indeferidos}
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>0%</span>
                <span>
                  {Math.abs(diff).toFixed(1)}pp {direction} da média ({fmtPct(media_geral)})
                </span>
                <span>100%</span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${Math.min(stats.taxa_aprovacao, 100)}%` }}
                />
                {/* Average marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/60"
                  style={{ left: `${Math.min(media_geral, 100)}%` }}
                />
              </div>
            </div>

            {stats.total < 10 && (
              <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Poucos casos similares (N &lt; 10) — interpretar com cautela
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/60">
              Fonte: SEMAD MG — decisões de licenciamento ambiental
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CasosSimilares({ casos }: { casos: ViabilidadeResponse["casos_similares"] }) {
  if (casos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Casos Similares</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum caso similar encontrado. Tente relaxar os filtros.
          </p>
        </CardContent>
      </Card>
    );
  }

  const nDef = casos.filter((c) => c.decisao === "deferido").length;
  const nInd = casos.filter((c) => c.decisao === "indeferido").length;
  const nArq = casos.filter((c) => c.decisao === "arquivamento").length;

  const parts: string[] = [];
  if (nDef) parts.push(`${nDef} deferido(s)`);
  if (nInd) parts.push(`${nInd} indeferido(s)`);
  if (nArq) parts.push(`${nArq} arquivamento(s)`);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          Casos Similares
          <Badge variant="secondary" className="tabular-nums">
            {casos.length}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {casos.length} casos mais recentes: {parts.join(" · ")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {casos.map((caso) => (
          <CasoCard key={caso.detail_id} caso={caso} />
        ))}
        <p className="text-[10px] text-muted-foreground/60">
          Fonte: SEMAD MG — decisões mais recentes para esses parâmetros
        </p>
      </CardContent>
    </Card>
  );
}

function CasoCard({ caso }: { caso: ViabilidadeResponse["casos_similares"][0] }) {
  const Icon =
    caso.decisao === "deferido"
      ? CheckCircle2
      : caso.decisao === "indeferido"
        ? XCircle
        : Archive;
  const iconColor =
    caso.decisao === "deferido"
      ? "text-success"
      : caso.decisao === "indeferido"
        ? "text-danger"
        : "text-muted-foreground";
  const badgeVariant =
    caso.decisao === "deferido"
      ? "default"
      : caso.decisao === "indeferido"
        ? "destructive"
        : "secondary";

  const portalUrl = `https://sistemas.meioambiente.mg.gov.br/licenciamento/site/view-externo?id=${caso.detail_id}`;
  const empreendimento = String(caso.empreendimento ?? "").slice(0, 60);

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{empreendimento || "Empreendimento"}</p>
          <Badge variant={badgeVariant as "default" | "destructive" | "secondary"} className="text-[10px] shrink-0">
            {caso.decisao}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {caso.municipio} · {caso.atividade} · Classe {caso.classe} · {caso.ano}
        </p>
      </div>
      <a
        href={portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        title="Ver no Portal SEMAD"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
