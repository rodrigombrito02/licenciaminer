"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchViabilidade,
  fetchLicenseTypes,
  generateViabilidadeReport,
  fmtNumber,
  fmtPct,
  type ViabilidadeResult,
  type LicenseType,
} from "@/lib/api";
import { useEffect } from "react";

const ATIVIDADES = [
  { code: "A-01", label: "Pesquisa Mineral" },
  { code: "A-02", label: "Lavra a Ceu Aberto" },
  { code: "A-03", label: "Lavra Subterranea" },
  { code: "A-04", label: "Dragagem / Agua Mineral" },
  { code: "A-05", label: "Beneficiamento" },
  { code: "A-06", label: "Pilha de Esteril / Barragem" },
  { code: "A-07", label: "Infraestrutura de Mineracao" },
];

function riscoColor(risco: string) {
  if (risco === "alto") return "text-danger";
  if (risco === "moderado") return "text-warning";
  return "text-success";
}

function riscoBadge(risco: string) {
  if (risco === "alto") return "bg-danger/10 text-danger border-danger/30";
  if (risco === "moderado") return "bg-warning/10 text-warning border-warning/30";
  return "bg-success/10 text-success border-success/30";
}

export default function ViabilidadePage() {
  const [step, setStep] = useState(1);
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ViabilidadeResult | null>(null);

  // Inputs
  const [atividade, setAtividade] = useState("A-02");
  const [classe, setClasse] = useState("4");
  const [licenca, setLicenca] = useState("LAC1");
  const [cnpj, setCnpj] = useState("");

  useEffect(() => {
    fetchLicenseTypes().then(setLicenseTypes).catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await fetchViabilidade({
        atividade,
        classe: Number(classe),
        licenca_tipo: licenca,
        cnpj: cnpj || undefined,
      });
      setResult(res);
      setStep(2);
    } catch (e) {
      console.error("Viabilidade error:", e);
    } finally {
      setLoading(false);
    }
  };

  const gaugeAngle = result?.perfil.probabilidade
    ? (result.perfil.probabilidade / 100) * 180
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-teal/10 p-2.5">
            <Search className="h-6 w-6 text-brand-teal" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight lg:text-3xl">
              Analise de Viabilidade
            </h1>
            <p className="text-sm text-muted-foreground">
              Avaliacao preliminar do perfil de licenciamento ambiental
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Input */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Search className="h-4 w-4 text-brand-teal" />
              Dados do Empreendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Atividade</label>
                <Select value={atividade} onValueChange={setAtividade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ATIVIDADES.map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        {a.code} — {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Classe de Impacto</label>
                <Select value={classe} onValueChange={setClasse}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6].map((c) => (
                      <SelectItem key={c} value={String(c)}>Classe {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Modalidade de Licenca</label>
                <Select value={licenca} onValueChange={setLicenca}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(licenseTypes ?? []).map((lt) => (
                      <SelectItem key={lt.code} value={lt.code}>
                        {lt.code} — {lt.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">CNPJ (opcional)</label>
                <Input
                  placeholder="12.345.678/0001-90"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Informe para incluir contexto historico da empresa
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleAnalyze} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analisar Viabilidade
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Result */}
      {step === 2 && result && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              Voltar e ajustar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateViabilidadeReport({
                atividade,
                classe: Number(classe),
                licenca_tipo: licenca,
                cnpj: cnpj || undefined,
              })}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Gerar Relatório
            </Button>
          </div>

          {/* Gauge + Perfil */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-8">
                {/* CSS Gauge */}
                <div className="relative w-[160px] h-[80px] overflow-hidden shrink-0">
                  <div
                    className="absolute bottom-0 left-0 w-[160px] h-[80px] rounded-t-full"
                    style={{
                      background: "conic-gradient(from 180deg at 50% 100%, var(--danger) 0deg, var(--warning) 90deg, var(--success) 180deg)",
                    }}
                  />
                  <div className="absolute bottom-0 left-[12px] w-[136px] h-[68px] rounded-t-full bg-white" />
                  <div
                    className="absolute bottom-0 left-[80px] w-[2px] h-[66px] bg-[var(--navy)] rounded-sm origin-bottom"
                    style={{ transform: `rotate(${-90 + gaugeAngle}deg)` }}
                  />
                  <div className="absolute bottom-1 left-0 w-[160px] text-center text-2xl font-extrabold text-[var(--navy)]">
                    {result.perfil.probabilidade ?? "—"}%
                  </div>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold">
                    Probabilidade de Aprovacao: {result.perfil.probabilidade ?? "—"}%
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Baseado em {fmtNumber(result.perfil.n_decisoes)} decisoes com perfil identico.
                    Media geral: {result.perfil.media_geral}%.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className={result.perfil.probabilidade && result.perfil.probabilidade < 65 ? "border-danger/30" : "border-success/30"}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-extrabold ${result.perfil.probabilidade && result.perfil.probabilidade < 65 ? "text-danger" : "text-success"}`}>
                  {result.perfil.probabilidade ?? "—"}%
                </p>
                <p className="text-xs text-muted-foreground">Probabilidade</p>
              </CardContent>
            </Card>
            <Card className={result.perfil.rigor_delta !== null && result.perfil.rigor_delta < -3 ? "border-danger/30" : "border-success/30"}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-extrabold ${result.perfil.rigor_delta !== null && result.perfil.rigor_delta < -3 ? "text-danger" : "text-success"}`}>
                  {result.perfil.rigor_delta !== null ? `${result.perfil.rigor_delta > 0 ? "+" : ""}${result.perfil.rigor_delta}pp` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Rigor Regional</p>
              </CardContent>
            </Card>
            <Card className={result.perfil.tendencia !== null && result.perfil.tendencia >= 0 ? "border-success/30" : "border-warning/30"}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-extrabold ${result.perfil.tendencia !== null && result.perfil.tendencia >= 0 ? "text-success" : "text-warning"}`}>
                  {result.perfil.tendencia !== null ? `${result.perfil.tendencia > 0 ? "+" : ""}${result.perfil.tendencia}pp` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Tendencia 3 anos</p>
              </CardContent>
            </Card>
          </div>

          {/* Fatores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <AlertTriangle className="h-4 w-4 text-brand-orange" />
                Fatores de Atencao
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Fator</th>
                    <th className="pb-2 font-medium">Valor</th>
                    <th className="pb-2 font-medium">Risco</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.fatores.map((f, i) => (
                    <tr key={i}>
                      <td className="py-2 font-medium">{f.fator}</td>
                      <td className="py-2">{f.valor}</td>
                      <td className="py-2">
                        <Badge variant="outline" className={`text-[9px] ${riscoBadge(f.risco)}`}>
                          {f.risco === "alto" ? "Alto" : f.risco === "moderado" ? "Moderado" : "Baixo"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Escopo estimado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <ShieldCheck className="h-4 w-4 text-brand-teal" />
                Estimativa de Escopo — Due Diligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-brand-teal">~{result.escopo.n_documentos}</p>
                  <p className="text-xs text-muted-foreground">Documentos Aplicaveis</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-brand-orange">~{fmtNumber(result.escopo.n_requisitos)}</p>
                  <p className="text-xs text-muted-foreground">Requisitos Mapeados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold">{result.escopo.n_normas}</p>
                  <p className="text-xs text-muted-foreground">Normas Aplicaveis</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-success">5</p>
                  <p className="text-xs text-muted-foreground">Relatorios Entregues</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                {result.escopo.licenca_desc} — Escopo definitivo confirmado na Fase 1 da DD
              </p>
            </CardContent>
          </Card>

          {/* Recomendacao */}
          <Card className={`border-2 ${result.risco_geral === "alto" ? "border-danger/30" : result.risco_geral === "moderado" ? "border-warning/30" : "border-success/30"}`}>
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">
                {result.risco_geral === "baixo" ? "✓" : "⚠"}
              </div>
              <p className={`text-lg font-bold ${result.risco_geral === "alto" ? "text-danger" : result.risco_geral === "moderado" ? "text-warning" : "text-success"}`}>
                {result.recomendacao}
              </p>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
                {result.risco_geral !== "baixo"
                  ? "A DD reduz significativamente o risco de exigencias complementares, indeferimento ou arquivamento."
                  : "Mesmo com perfil favoravel, a DD garante conformidade total antes do protocolo."}
              </p>
            </CardContent>
          </Card>

          {/* CTAs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/due-diligence">
              <Card className="group border-brand-teal/20 hover:border-brand-teal/50 transition-all hover:shadow-md h-full cursor-pointer">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold group-hover:text-brand-teal">Iniciar Due Diligence</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Avaliacao completa de conformidade documental em 5 fases.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-teal">
                    Comecar agora <ArrowRight className="h-3 w-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
            <a href="https://summoquartile.com" target="_blank" rel="noopener noreferrer">
              <Card className="group border-brand-orange/20 hover:border-brand-orange/50 transition-all hover:shadow-md h-full cursor-pointer">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold group-hover:text-brand-orange">Solicitar Proposta Tecnica</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Receba uma proposta detalhada com escopo, cronograma e investimento.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-orange">
                    Fale conosco <ExternalLink className="h-3 w-3" />
                  </span>
                </CardContent>
              </Card>
            </a>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/40">
            Analise baseada em dados publicos historicos. Nao constitui garantia de resultado. Validade: 90 dias.
          </p>
        </div>
      )}
    </div>
  );
}
