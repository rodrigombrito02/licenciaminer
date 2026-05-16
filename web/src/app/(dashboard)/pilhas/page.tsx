"use client";

import { useEffect, useState } from "react";
import {
  Layers,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Building2,
  ClipboardList,
  Calendar,
  Ruler,
  Download,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  fetchPilhasStats,
  fetchPilhasEtapas,
  fetchPilhasModos,
  fetchPilhasModalidades,
  fetchPilhasNormas,
  fetchPilhasDocuments,
  fetchPilhasAllRequirements,
  submitPilhasScore,
  generatePilhasReport,
  downloadPilhasXlsx,
  lookupPilhasByCnpj,
  type PilhasCnpjLookup,
  type PilhasStats,
  type PilhasEtapa,
  type PilhasModo,
  type PilhasModalidade,
  type PilhasNorma,
  type PilhasDocumento,
  type PilhasRequisito,
  type PilhasScoreResult,
  type DadosPilha,
} from "@/lib/api";

type Avaliacao = "Atende" | "Atende Parcialmente" | "Nao Atende" | "Nao Aplica";
type Modo = "AUDITORIA" | "LICENCIAMENTO" | "FECHAMENTO_MODO";

const MODO_LABEL: Record<Modo, string> = {
  AUDITORIA: "Auditoria de ativo existente",
  LICENCIAMENTO: "Licenciamento (pré-protocolo)",
  FECHAMENTO_MODO: "Descomissionamento / fechamento",
};

const MODO_SHORT: Record<Modo, string> = {
  AUDITORIA: "Auditoria",
  LICENCIAMENTO: "Licenciamento",
  FECHAMENTO_MODO: "Fechamento",
};

export default function PilhasPage() {
  const [stats, setStats] = useState<PilhasStats | null>(null);
  const [etapas, setEtapas] = useState<PilhasEtapa[]>([]);
  const [modalidades, setModalidades] = useState<PilhasModalidade[]>([]);
  const [modos, setModos] = useState<PilhasModo[]>([]);
  const [normas, setNormas] = useState<PilhasNorma[]>([]);
  const [docs, setDocs] = useState<PilhasDocumento[]>([]);
  const [reqs, setReqs] = useState<PilhasRequisito[]>([]);
  const [result, setResult] = useState<PilhasScoreResult | null>(null);

  const [modo, setModo] = useState<Modo>("AUDITORIA");
  const [modalidade, setModalidade] = useState("LAC1");
  const [incluirGistm, setIncluirGistm] = useState(false);
  const [etapaFilter, setEtapaFilter] = useState<string>("");
  const [avaliacoes, setAvaliacoes] = useState<Record<string, Avaliacao>>({});
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatingXlsx, setGeneratingXlsx] = useState(false);
  const [cnpjLookup, setCnpjLookup] = useState<PilhasCnpjLookup | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Dados da pilha (Modo Auditoria)
  const [dadosPilha, setDadosPilha] = useState<DadosPilha>({
    nome: "",
    classe: undefined,
    tipo: "",
    metodo_construtivo: "",
    material: "",
    altura_m: undefined,
    volume_m3: undefined,
    data_inicio: "",
    consequencia: "",
    municipio: "",
    cnpj: "",
  });

  // Persistência local — restaurar
  useEffect(() => {
    try {
      const savedAval = localStorage.getItem("pilhas_avaliacoes");
      const savedDados = localStorage.getItem("pilhas_dadosPilha");
      const savedModo = localStorage.getItem("pilhas_modo");
      if (savedAval) setAvaliacoes(JSON.parse(savedAval));
      if (savedDados) setDadosPilha(JSON.parse(savedDados));
      if (savedModo) setModo(savedModo as Modo);
    } catch {}
  }, []);

  // Persistência local — salvar
  useEffect(() => {
    try {
      localStorage.setItem("pilhas_avaliacoes", JSON.stringify(avaliacoes));
    } catch {}
  }, [avaliacoes]);
  useEffect(() => {
    try {
      localStorage.setItem("pilhas_dadosPilha", JSON.stringify(dadosPilha));
    } catch {}
  }, [dadosPilha]);
  useEffect(() => {
    try {
      localStorage.setItem("pilhas_modo", modo);
    } catch {}
  }, [modo]);

  useEffect(() => {
    Promise.all([
      fetchPilhasStats(),
      fetchPilhasEtapas(),
      fetchPilhasModos(),
      fetchPilhasModalidades(),
      fetchPilhasNormas(),
    ])
      .then(([s, e, md, m, n]) => {
        setStats(s);
        setEtapas(e);
        setModos(md);
        setModalidades(m);
        setNormas(n);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingDocs(true);
    const params =
      modo === "LICENCIAMENTO"
        ? { modalidade, incluirGistm }
        : { modo, incluirGistm };
    Promise.all([
      fetchPilhasDocuments(params),
      fetchPilhasAllRequirements(params),
    ])
      .then(([d, r]) => {
        setDocs(d.documents);
        setReqs(r.requirements);
      })
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }, [modo, modalidade, incluirGistm]);

  const docsVisiveis = etapaFilter
    ? docs.filter((d) => d.etapa === etapaFilter)
    : docs;

  const etapasDoModo = modos.find((m) => m.codigo === modo)?.etapas || [];

  const handleCnpjLookup = async () => {
    const cnpj = (dadosPilha.cnpj || "").replace(/\D/g, "");
    if (cnpj.length !== 14) {
      setCnpjLookup({ cnpj, encontrado: false, mensagem: "Informe um CNPJ válido (14 dígitos)." });
      return;
    }
    setLookingUp(true);
    try {
      const r = await lookupPilhasByCnpj(cnpj);
      setCnpjLookup(r);
      if (r.encontrado && r.sugestao_auto_populate) {
        const sug = r.sugestao_auto_populate;
        setDadosPilha((d) => ({
          ...d,
          material: d.material || sug.material || d.material,
          municipio: d.municipio || sug.municipio || d.municipio,
        }));
      }
    } catch (e) {
      console.error(e);
      setCnpjLookup({ cnpj, encontrado: false, mensagem: "Falha ao consultar." });
    } finally {
      setLookingUp(false);
    }
  };

  const handleXlsx = async () => {
    setGeneratingXlsx(true);
    try {
      await downloadPilhasXlsx({
        modo,
        modalidade: modo === "LICENCIAMENTO" ? modalidade : undefined,
        incluir_gistm: incluirGistm,
        avaliacoes,
        doc_status: {},
        dados_pilha: modo !== "LICENCIAMENTO" ? dadosPilha : undefined,
      });
    } catch (e) {
      console.error("Erro ao gerar XLSX:", e);
    } finally {
      setGeneratingXlsx(false);
    }
  };

  const handleReport = async () => {
    setGeneratingReport(true);
    try {
      await generatePilhasReport({
        modo,
        modalidade: modo === "LICENCIAMENTO" ? modalidade : undefined,
        incluir_gistm: incluirGistm,
        avaliacoes,
        doc_status: {},
        dados_pilha: modo !== "LICENCIAMENTO" ? dadosPilha : undefined,
      });
    } catch (e) {
      console.error("Erro ao gerar relatório:", e);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleScore = async () => {
    setScoring(true);
    try {
      const r = await submitPilhasScore({
        modo,
        modalidade: modo === "LICENCIAMENTO" ? modalidade : undefined,
        incluir_gistm: incluirGistm,
        avaliacoes,
        doc_status: {},
        dados_pilha: modo === "AUDITORIA" ? dadosPilha : undefined,
      });
      setResult(r);
    } catch {
      setResult(null);
    } finally {
      setScoring(false);
    }
  };

  const kpis = stats && (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KPI label="Documentos no inventário" value={stats.total_documentos} icon={FileText} />
      <KPI label="Aplicáveis a este modo" value={docs.length} icon={ShieldCheck} />
      <KPI label="Requisitos aplicáveis" value={reqs.length} icon={ClipboardList} />
      <KPI label="Normas de referência" value={stats.total_normas} icon={Layers} />
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Layers className="h-6 w-6 text-brand-teal" />
            Conformidade de Pilhas
            <Badge variant="secondary" className="ml-2">Módulo novo</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Verificação de aderência a 23 normas (ANM, ABNT, MG, Federal PL, GISTM) para pilhas
            de rejeito e estéril — primariamente para auditoria de ativos existentes em operação.
          </p>
        </div>
      </div>

      {/* MODO SELECTOR — destaque */}
      <Card className="border-2 border-brand-teal/40">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-teal" />
            Modo de uso
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          {(["AUDITORIA", "LICENCIAMENTO", "FECHAMENTO_MODO"] as Modo[]).map((m) => (
            <Button
              key={m}
              variant={modo === m ? "default" : "outline"}
              onClick={() => setModo(m)}
              className="h-auto py-3 flex flex-col items-start text-left whitespace-normal"
            >
              <div className="font-bold">{MODO_SHORT[m]}</div>
              <div className="text-xs opacity-80">{MODO_LABEL[m]}</div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* DADOS DA PILHA — só em Modo AUDITORIA ou FECHAMENTO */}
      {modo !== "LICENCIAMENTO" && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-teal" />
              Dados da pilha existente
              <Badge variant="outline" className="ml-2 text-xs">
                opcional, mas melhora recomendações
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Nome / identificação da pilha
              </label>
              <Input
                value={dadosPilha.nome || ""}
                onChange={(e) =>
                  setDadosPilha({ ...dadosPilha, nome: e.target.value })
                }
                placeholder="Ex: PDE Norte, PDR Itabirito..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                CNPJ da titular
              </label>
              <div className="flex gap-1">
                <Input
                  value={dadosPilha.cnpj || ""}
                  onChange={(e) =>
                    setDadosPilha({ ...dadosPilha, cnpj: e.target.value })
                  }
                  placeholder="00.000.000/0000-00"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCnpjLookup}
                  disabled={lookingUp}
                  title="Consultar bases públicas (ANM, CFEM, IBAMA)"
                >
                  {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "🔍"}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Município / MG
              </label>
              <Input
                value={dadosPilha.municipio || ""}
                onChange={(e) =>
                  setDadosPilha({ ...dadosPilha, municipio: e.target.value })
                }
                placeholder="Ex: Itabirito"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Classe (DN COPAM 217)
              </label>
              <Select
                value={dadosPilha.classe ? String(dadosPilha.classe) : "-"}
                onValueChange={(v) =>
                  setDadosPilha({
                    ...dadosPilha,
                    classe: v === "-" ? undefined : Number(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Não definida</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      Classe {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Tipo de pilha
              </label>
              <Select
                value={dadosPilha.tipo || "-"}
                onValueChange={(v) =>
                  setDadosPilha({ ...dadosPilha, tipo: v === "-" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Não definido</SelectItem>
                  <SelectItem value="rejeito">Rejeito</SelectItem>
                  <SelectItem value="esteril">Estéril</SelectItem>
                  <SelectItem value="mista">Mista (codisposição)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Método construtivo
              </label>
              <Select
                value={dadosPilha.metodo_construtivo || "-"}
                onValueChange={(v) =>
                  setDadosPilha({
                    ...dadosPilha,
                    metodo_construtivo: v === "-" ? "" : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Não definido</SelectItem>
                  <SelectItem value="dry_stack">Dry Stack (empilhamento a seco / filtered tailings)</SelectItem>
                  <SelectItem value="empilhamento_drenado">Empilhamento drenado</SelectItem>
                  <SelectItem value="pde_convencional">PDE convencional</SelectItem>
                  <SelectItem value="co_disposicao">Codisposição</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Material predominante
              </label>
              <Input
                value={dadosPilha.material || ""}
                onChange={(e) =>
                  setDadosPilha({ ...dadosPilha, material: e.target.value })
                }
                placeholder="Ex: minério de ferro, bauxita, ouro..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Altura máxima (m)
              </label>
              <Input
                type="number"
                value={dadosPilha.altura_m ?? ""}
                onChange={(e) =>
                  setDadosPilha({
                    ...dadosPilha,
                    altura_m: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="Ex: 80"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Volume acumulado (m³)
              </label>
              <Input
                type="number"
                value={dadosPilha.volume_m3 ?? ""}
                onChange={(e) =>
                  setDadosPilha({
                    ...dadosPilha,
                    volume_m3: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="Ex: 15000000"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Data de início de operação
              </label>
              <Input
                type="date"
                value={dadosPilha.data_inicio || ""}
                onChange={(e) =>
                  setDadosPilha({ ...dadosPilha, data_inicio: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Classificação de consequência (GISTM)
              </label>
              <Select
                value={dadosPilha.consequencia || "-"}
                onValueChange={(v) =>
                  setDadosPilha({
                    ...dadosPilha,
                    consequencia: v === "-" ? "" : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Não classificada</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="significant">Significant</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="very_high">Very High</SelectItem>
                  <SelectItem value="extreme">Extreme</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RESULTADO DO LOOKUP CNPJ */}
      {cnpjLookup && modo !== "LICENCIAMENTO" && (
        <Card className={cnpjLookup.encontrado ? "border-brand-teal/40" : "border-amber-400/40"}>
          <CardContent className="p-4 space-y-2">
            {!cnpjLookup.encontrado ? (
              <div className="text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 inline mr-1 text-amber-500" />
                {cnpjLookup.mensagem || "CNPJ não encontrado nas bases públicas."}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-bold">{cnpjLookup.empresa?.razao_social}</span>
                  {cnpjLookup.analise_pilhas?.provavel_opera_pilhas && (
                    <Badge className="bg-brand-teal text-white">
                      Provavelmente opera pilhas
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Títulos ANM</div>
                    <div className="font-bold text-base">{cnpjLookup.titulos_anm?.total ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {cnpjLookup.titulos_anm?.lavra_concessao ?? 0} em lavra/concessão
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">CFEM (meses)</div>
                    <div className="font-bold text-base">{cnpjLookup.cfem?.meses_pagamento ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground">
                      R$ {((cnpjLookup.cfem?.total_pago ?? 0) / 1_000_000).toFixed(1)}M total
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Infrações IBAMA</div>
                    <div className="font-bold text-base">{cnpjLookup.infracoes?.total ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground">
                      em {cnpjLookup.infracoes?.anos_com_infracao ?? 0} anos
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Substância principal</div>
                    <div className="font-bold text-sm leading-tight">
                      {cnpjLookup.cfem?.substancias_top?.[0]?.substancia || "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {cnpjLookup.cfem?.substancias_top?.[0]?.municipio || ""}
                    </div>
                  </div>
                </div>
                {cnpjLookup.sugestao_auto_populate?.material && (
                  <div className="text-xs text-muted-foreground italic pt-1">
                    Campos "Material" e "Município" auto-preenchidos com base em CFEM.
                    Revise antes de prosseguir.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* CONFIG DE FILTROS */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          {modo === "LICENCIAMENTO" && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                Modalidade de licenciamento
              </label>
              <Select value={modalidade} onValueChange={setModalidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modalidades.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.code} — {m.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">
              Refinar por etapa
            </label>
            <Select
              value={etapaFilter || "TODAS"}
              onValueChange={(v) => setEtapaFilter(v === "TODAS" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as etapas do modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as etapas</SelectItem>
                {etapas
                  .filter((e) => etapasDoModo.includes(e.codigo))
                  .map((e) => (
                    <SelectItem key={e.codigo} value={e.codigo}>
                      {e.codigo} — {e.descricao.substring(0, 50)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              GISTM (premium)
            </label>
            <Button
              variant={incluirGistm ? "default" : "outline"}
              size="sm"
              onClick={() => setIncluirGistm(!incluirGistm)}
              className="w-full"
            >
              {incluirGistm ? "✓ Incluindo GISTM" : "+ Incluir GISTM"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Overlay premium — 77 requisitos ICMM
            </p>
          </div>
        </CardContent>
      </Card>

      {kpis}

      {/* Resumo */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
          <span>
            Modo: <strong>{MODO_SHORT[modo]}</strong>
          </span>
          <span>
            <strong>{docsVisiveis.length}</strong> documentos aplicáveis
          </span>
          <span>
            <strong>{reqs.length}</strong> requisitos
          </span>
          {incluirGistm && (
            <Badge className="bg-brand-gold text-brand-navy">+ GISTM</Badge>
          )}
          {loadingDocs && (
            <Loader2 className="h-4 w-4 animate-spin text-brand-teal" />
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="docs">
        <TabsList>
          <TabsTrigger value="docs">Documentos ({docsVisiveis.length})</TabsTrigger>
          <TabsTrigger value="reqs">Requisitos ({reqs.length})</TabsTrigger>
          <TabsTrigger value="normas">Arcabouço ({normas.length})</TabsTrigger>
          <TabsTrigger value="avaliar">Avaliar</TabsTrigger>
        </TabsList>

        <TabsContent value="docs">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Etapa</th>
                      <th className="text-left p-2">Documento</th>
                      <th className="text-left p-2">Esfera</th>
                      <th className="text-left p-2">Norma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docsVisiveis.map((d, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {d.etapa}
                          </Badge>
                        </td>
                        <td className="p-2 font-medium">{d.documento}</td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {d.esfera}
                        </td>
                        <td className="p-2 text-xs">{d.norma_referencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reqs">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Módulo</th>
                      <th className="text-left p-2">Tópico</th>
                      <th className="text-left p-2">Teste</th>
                      <th className="text-left p-2">Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reqs.map((r) => (
                      <tr key={r.requisito_id} className="border-t hover:bg-muted/30">
                        <td className="p-2 font-mono text-xs">{r.requisito_id}</td>
                        <td className="p-2 text-xs">{r.modulo}</td>
                        <td className="p-2 text-xs">{r.topico}</td>
                        <td className="p-2">{r.teste_aderencia}</td>
                        <td className="p-2 text-xs">{r.peso}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="normas">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Norma</th>
                      <th className="text-left p-2">Órgão</th>
                      <th className="text-left p-2">Esfera</th>
                      <th className="text-left p-2">Descrição</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normas.map((n, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-2 font-medium">{n.norma}</td>
                        <td className="p-2 text-xs">{n.orgao}</td>
                        <td className="p-2 text-xs">{n.esfera}</td>
                        <td className="p-2 text-xs">{n.descricao}</td>
                        <td className="p-2 text-xs">
                          <Badge
                            variant={
                              n.status.includes("vigente") ? "default" : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {n.status.includes("vigente") ? "vigente" : "tramitando"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avaliar">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">
                Avalie cada requisito {reqs.length > 20 && `(primeiros 20 para prova rápida; total ${reqs.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reqs.slice(0, 20).map((r) => (
                <div
                  key={r.requisito_id}
                  className="flex flex-col md:flex-row md:items-center gap-2 border-b pb-2"
                >
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">
                      {r.requisito_id} · {r.topico}
                    </div>
                    <div className="text-sm">{r.teste_aderencia}</div>
                  </div>
                  <Select
                    value={avaliacoes[r.requisito_id] || ""}
                    onValueChange={(v) =>
                      setAvaliacoes({
                        ...avaliacoes,
                        [r.requisito_id]: v as Avaliacao,
                      })
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Atende">Atende</SelectItem>
                      <SelectItem value="Atende Parcialmente">
                        Atende Parcialmente
                      </SelectItem>
                      <SelectItem value="Nao Atende">Não Atende</SelectItem>
                      <SelectItem value="Nao Aplica">Não Aplica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleScore}
                  disabled={scoring || Object.keys(avaliacoes).length === 0}
                >
                  {scoring ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Calcular Conformidade
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleReport}
                  disabled={generatingReport || Object.keys(avaliacoes).length === 0}
                >
                  {generatingReport ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Gerar Relatório (HTML/PDF)
                </Button>
                <Button
                  variant="outline"
                  onClick={handleXlsx}
                  disabled={generatingXlsx || Object.keys(avaliacoes).length === 0}
                >
                  {generatingXlsx ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Baixar Planilha (XLSX)
                </Button>
              </div>

              {result && (
                <Card className="border-2 mt-4" style={{ borderColor: result.cor }}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: result.cor }}
                      >
                        {Math.round(result.conformidade_nao_ponderada * 100)}%
                      </div>
                      <div>
                        <div className="font-bold text-lg">{result.classificacao}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.descricao}
                        </div>
                        {dadosPilha.nome && modo === "AUDITORIA" && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Pilha: <strong>{dadosPilha.nome}</strong>
                            {dadosPilha.classe && ` · Classe ${dadosPilha.classe}`}
                            {dadosPilha.tipo && ` · ${dadosPilha.tipo}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                      <KPISmall icon={CheckCircle2} label="Atende" value={result.atende} color="text-success" />
                      <KPISmall icon={AlertTriangle} label="Parcial" value={result.atende_parcial} color="text-warning" />
                      <KPISmall icon={XCircle} label="Não Atende" value={result.nao_atende} color="text-danger" />
                      <KPISmall icon={FileText} label="Não Aplica" value={result.nao_aplica} color="text-muted-foreground" />
                    </div>
                    {result.recomendacoes?.length > 0 && (
                      <div className="pt-2 text-xs">
                        <div className="font-medium mb-1">
                          Recomendações ({result.recomendacoes.length}):
                        </div>
                        <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                          {result.recomendacoes.slice(0, 5).map((rec, i) => (
                            <li key={i}>
                              <Badge variant="outline" className="mr-1">
                                {rec.prioridade}
                              </Badge>
                              {rec.teste}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-6 w-6 text-brand-teal flex-shrink-0" />
        <div>
          <div className="text-2xl font-bold font-tabular">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function KPISmall({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <Icon className={`h-4 w-4 ${color}`} />
      <div className={`font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
