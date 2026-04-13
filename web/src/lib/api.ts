const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/* ── Overview ── */

interface RawOverviewStats {
  mg_summary: {
    total_decisoes: number;
    deferidos: number;
    indeferidos: number;
    outros: number;
    taxa_aprovacao_geral: number;
  };
  mining_summary: {
    total_decisoes: number;
    deferidos: number;
    indeferidos: number;
    arquivamentos: number;
    outros: number;
    taxa_aprovacao_mineracao: number;
  };
  ibama_summary: {
    total_licencas: number;
    tipos_distintos: number;
  };
  anm_summary: {
    total_processos: number;
    ufs_distintas: number;
    fases_distintas: number;
    area_total_ha: number;
  };
}

export interface OverviewStats {
  total_decisoes: number;
  deferidos: number;
  indeferidos: number;
  taxa_aprovacao: number;
  total_infracoes: number;
  total_licencas_ibama: number;
  total_processos_anm: number;
  taxa_aprovacao_mineracao: number;
  total_decisoes_mineracao: number;
}

export interface TrendPoint {
  ano: string;
  deferidos: number;
  total: number;
  taxa_aprovacao: number;
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const raw = await apiFetch<RawOverviewStats>("/overview/stats");
  return {
    total_decisoes: raw.mg_summary.total_decisoes,
    deferidos: raw.mg_summary.deferidos,
    indeferidos: raw.mg_summary.indeferidos,
    taxa_aprovacao: raw.mining_summary.taxa_aprovacao_mineracao,
    total_infracoes: raw.ibama_summary.total_licencas,
    total_licencas_ibama: raw.ibama_summary.total_licencas,
    total_processos_anm: raw.anm_summary.total_processos,
    taxa_aprovacao_mineracao: raw.mining_summary.taxa_aprovacao_mineracao,
    total_decisoes_mineracao: raw.mining_summary.total_decisoes,
  };
}

export function fetchOverviewTrend() {
  return apiFetch<TrendPoint[]>("/overview/trend");
}

export interface Insight {
  title: string;
  value: string;
  detail: string;
  tone: "positive" | "neutral" | "negative";
}

export function fetchOverviewInsights() {
  return apiFetch<Insight[]>("/overview/insights");
}

export interface SourceMeta {
  key: string;
  name: string;
  records: number | null;
  last_collected: string | null;
  url: string | null;
}

export function fetchMetaSources() {
  return apiFetch<SourceMeta[]>("/meta/sources");
}

export function fetchFreshness() {
  return apiFetch<{ last_updated: string | null }>("/meta/freshness");
}

/* ── Empresa ── */

export interface EmpresaProfile {
  cnpj: string;
  profile: {
    razao_social: string;
    cnae_fiscal: string;
    cnae_descricao: string;
    porte: string;
    data_abertura: string;
    situacao: string;
    total_decisoes: number;
    deferidos: number;
    indeferidos: number;
    arquivamentos: number;
    taxa_aprovacao: number;
  } | null;
  infracoes: {
    total_infracoes: number;
    anos_com_infracao: number;
  };
  cfem: {
    meses_pagamento: number;
    total_pago: number;
  };
}

export interface Decision {
  processo: string;
  atividade: string;
  classe: number;
  modalidade: string;
  decisao: string;
  data_decisao: string;
  municipio: string;
  detail_id?: string | number;
  [key: string]: unknown;
}

export function fetchEmpresa(cnpj: string) {
  return apiFetch<EmpresaProfile>(`/empresa/${cnpj}`);
}

export function fetchEmpresaDecisions(cnpj: string) {
  return apiFetch<Decision[]>(`/empresa/${cnpj}/decisions`);
}

/* ── Report ── */

export interface ReportData {
  cnpj: string;
  razao_social: string;
  risk_level: string;
  findings: string[];
  taxa_aprovacao: number;
  total_decisoes: number;
  total_infracoes: number;
  cfem_total_pago: number;
  cfem_meses_pagamento: number;
  decisoes: Decision[];
  casos_similares: Record<string, unknown>[];
}

export function fetchReportData(cnpj: string) {
  return apiFetch<ReportData>(`/report/${cnpj}/data`);
}

/* ── Rankings ── */

export function fetchEmpresasRanking() {
  return apiFetch<Record<string, unknown>[]>("/empresas/ranking");
}

/* ── Decisions analytics ── */

export function fetchApprovalRates() {
  return apiFetch<Record<string, unknown>[]>("/decisions/approval-rates");
}

export function fetchDecisionsByModalidade() {
  return apiFetch<Record<string, unknown>[]>("/decisions/by-modalidade");
}

/* ── Decisions analytics ── */

export interface ApprovalRate {
  ano: number;
  classe: number;
  atividade: string;
  regional: string;
  total: number;
  deferidos: number;
  indeferidos: number;
  taxa_aprovacao: number;
}

export interface ModalidadeBreakdown {
  modalidade: string;
  decisao: string;
  n: number;
}

export interface RejectionTrend {
  ano: number;
  total: number;
  deferidos: number;
  indeferidos: number;
  arquivamentos: number;
  taxa_indeferimento: number;
  taxa_arquivamento: number;
}

export interface RegionalRigor {
  regional: string;
  total: number;
  deferidos: number;
  indeferidos: number;
  taxa_aprovacao: number;
  taxa_indeferimento: number;
}

export function fetchRejectionTrend() {
  return apiFetch<RejectionTrend[]>("/decisions/rejection-trend");
}

export function fetchRegionalRigor() {
  return apiFetch<RegionalRigor[]>("/decisions/regional-rigor");
}

export interface InfractionBand {
  faixa_infracoes: string;
  total: number;
  deferidos: number;
  indeferidos: number;
  taxa_aprovacao: number;
}

export interface InfractionsVsApproval {
  total_infracoes: number;
  total_decisoes: number;
  deferidos: number;
  taxa_aprovacao: number;
}

export interface ClassModalidade {
  classe: number;
  modalidade: string;
  total: number;
  deferidos: number;
  taxa_aprovacao: number;
}

export function fetchInfractionBands() {
  return apiFetch<InfractionBand[]>("/decisions/infraction-bands");
}

export function fetchInfractionsVsApproval() {
  return apiFetch<InfractionsVsApproval[]>("/decisions/infractions-vs-approval");
}

export function fetchClassModalidade() {
  return apiFetch<ClassModalidade[]>("/decisions/class-modalidade");
}

export interface ActivityClassHeatmap {
  atividade_code: string;
  atividade_desc: string;
  classe: number;
  total: number;
  deferidos: number;
  indeferidos: number;
  taxa_aprovacao: number;
}

export function fetchActivityClassHeatmap() {
  return apiFetch<ActivityClassHeatmap[]>("/decisions/activity-class-heatmap");
}

export interface CfemVsApproval {
  perfil_empresa: string;
  total_decisoes: number;
  deferidos: number;
  indeferidos: number;
  taxa_aprovacao: number;
}

export function fetchCfemVsApproval() {
  return apiFetch<CfemVsApproval[]>("/decisions/cfem-vs-approval");
}

export interface RecidivismBand {
  faixa: string;
  empresas: number;
  total_decisoes_grupo: number;
  taxa_media_aprovacao: number;
}

export function fetchRecidivism() {
  return apiFetch<RecidivismBand[]>("/decisions/recidivism");
}

export interface ShelvingAnalysis {
  classe: number;
  atividade_grupo: string;
  total: number;
  arquivamentos: number;
  taxa_arquivamento: number;
}

export function fetchShelvingAnalysis() {
  return apiFetch<ShelvingAnalysis[]>("/decisions/shelving-analysis");
}

/* ── Due Diligence ── */

export interface LicenseType {
  code: string;
  description: string;
}

export interface DDDocument {
  documento: string;
  modalidade: string;
  licenca: string;
  descricao: string;
}

export interface DDRequirement {
  requisito_id: string;
  documento: string;
  topico: string;
  teste_aderencia: string;
  evidencia_esperada: string;
}

export interface DDScoreResult {
  total_requisitos: number;
  requisitos_aplicaveis: number;
  atende: number;
  atende_parcial: number;
  nao_atende: number;
  nao_aplica: number;
  conformidade_nao_ponderada: number;
  conformidade_ponderada: number;
  nota_maxima: number;
  nota_obtida: number;
  classificacao: string;
  cor: string;
  descricao: string;
  checklist?: Record<string, unknown>;
  recomendacoes: {
    requisito_id: string;
    tipo: string;
    prioridade: string;
    documento: string;
    topico: string;
    teste: string;
    evidencia: string;
  }[];
}

export function fetchLicenseTypes() {
  return apiFetch<LicenseType[]>("/due-diligence/license-types");
}

export function fetchDDDocuments(licencaTipo: string) {
  return apiFetch<{ licenca_tipo: string; total: number; documents: DDDocument[] }>(
    `/due-diligence/documents?licenca_tipo=${encodeURIComponent(licencaTipo)}`
  );
}

export function fetchDDRequirements(documento: string) {
  return apiFetch<{ documento: string; total: number; requirements: DDRequirement[] }>(
    `/due-diligence/requirements?documento=${encodeURIComponent(documento)}`
  );
}

export function submitDDScore(payload: {
  avaliacoes: Record<string, string>;
  pesos?: Record<string, number>;
  doc_status?: Record<string, string>;
}) {
  return apiFetch<DDScoreResult>("/due-diligence/score", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ── DD Upload & Criticality ── */

export interface DDUploadResult {
  filename: string;
  pages: number;
  size_bytes: number;
  text_length: number;
  text_preview: string;
  extracted_text: string;
  error?: string;
}

export async function uploadDDDocument(file: File): Promise<DDUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
  const res = await fetch(`${API}/due-diligence/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export interface CriticalityItem {
  requisito_id: string;
  documento: string;
  topico: string;
  teste: string;
  avaliacao: string;
  impacto: number;
  complexidade: number;
  quadrante: string;
}

export interface TopicAdherence {
  topico: string;
  total: number;
  atende: number;
  parcial: number;
  nao_atende: number;
  taxa_aderencia: number;
}

export interface CriticalityResult {
  non_conformes: CriticalityItem[];
  total_non_conformes: number;
  por_tema: TopicAdherence[];
  gargalos: string[];
  quadrantes: {
    acao_imediata_complexa: number;
    acao_imediata_simples: number;
    acoes_secundarias: number;
    baixa_prioridade: number;
  };
}

export function submitDDCriticality(avaliacoes: Record<string, string>) {
  return apiFetch<CriticalityResult>("/due-diligence/criticality", {
    method: "POST",
    body: JSON.stringify({ avaliacoes }),
  });
}

/* ── Explorer ── */

export interface ExplorerResponse {
  dataset: string;
  total: number;
  limit: number;
  offset: number;
  rows: Record<string, unknown>[];
}

export interface ExplorerFilters {
  limit?: number;
  offset?: number;
  search?: string;
  decisao?: string;
  classe?: number;
  ano_min?: number;
  ano_max?: number;
  mining_only?: boolean;
  uf?: string;
}

export interface RecordText {
  text: string;
  truncated: boolean;
  total_length: number;
}

export function fetchExplorerDatasets() {
  return apiFetch<Record<string, string>>("/explorer/datasets");
}

export function fetchExplorerData(dataset: string, params?: ExplorerFilters) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.search) qs.set("search", params.search);
  if (params?.decisao) qs.set("decisao", params.decisao);
  if (params?.classe) qs.set("classe", String(params.classe));
  if (params?.ano_min) qs.set("ano_min", String(params.ano_min));
  if (params?.ano_max) qs.set("ano_max", String(params.ano_max));
  if (params?.mining_only) qs.set("mining_only", "true");
  if (params?.uf) qs.set("uf", params.uf);
  const q = qs.toString();
  return apiFetch<ExplorerResponse>(`/explorer/${dataset}${q ? `?${q}` : ""}`);
}

export function fetchExplorerRecord(dataset: string, recordId: string) {
  return apiFetch<Record<string, unknown>>(
    `/explorer/${dataset}/record/${encodeURIComponent(recordId)}`
  );
}

export function fetchExplorerRecordText(dataset: string, recordId: string) {
  return apiFetch<RecordText>(
    `/explorer/${dataset}/record/${encodeURIComponent(recordId)}/text`
  );
}

export function explorerExportUrl(dataset: string, params?: ExplorerFilters): string {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.decisao) qs.set("decisao", params.decisao);
  if (params?.classe) qs.set("classe", String(params.classe));
  if (params?.ano_min) qs.set("ano_min", String(params.ano_min));
  if (params?.ano_max) qs.set("ano_max", String(params.ano_max));
  if (params?.mining_only) qs.set("mining_only", "true");
  if (params?.uf) qs.set("uf", params.uf);
  const q = qs.toString();
  return `${API_BASE}/explorer/${dataset}/export.csv${q ? `?${q}` : ""}`;
}

/* ── Empresa ANM ── */

export interface ANMTitulo {
  PROCESSO: string;
  FASE: string;
  SUBS: string;
  AREA_HA: number;
  ANO: number;
  UF: string;
}

export function fetchEmpresaANM(cnpj: string) {
  return apiFetch<{ titular: string; total: number; titulos: ANMTitulo[] }>(
    `/empresa/${cnpj}/anm`
  );
}

/* ── Empresa Infrações (row-level) ── */

export interface InfracaoDetail {
  data_infracao: string | null;
  nome: string;
  descricao: string;
  municipio: string;
  uf: string;
  fonte: string | null;
}

export function fetchEmpresaInfracoes(cnpj: string) {
  return apiFetch<InfracaoDetail[]>(`/empresa/${cnpj}/infracoes`);
}

/* ── Empresa CFEM Breakdown ── */

export interface CfemRow {
  substancia: string;
  municipio: string;
  processo: string;
  valor: number | null;
  ano: number | null;
}

export interface CfemSummary {
  substancia: string;
  ano: number;
  valor: number;
  meses: number;
}

export interface CfemBreakdown {
  rows: CfemRow[];
  summary: CfemSummary[];
}

export function fetchEmpresaCfemBreakdown(cnpj: string) {
  return apiFetch<CfemBreakdown>(`/empresa/${cnpj}/cfem-breakdown`);
}

/* ── Empresa Filiais ── */

export interface Filial {
  cnpj: string;
  total_decisoes: number;
  empreendimento: string;
}

export function fetchEmpresaFiliais(cnpj: string) {
  return apiFetch<Filial[]>(`/empresa/${cnpj}/filiais`);
}

/* ── Report PDF ── */

export async function downloadReportPDF(cnpj: string): Promise<void> {
  const res = await fetch(`${API_BASE}/report/${cnpj}/download-sync`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Erro ao gerar relatório: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio_${cnpj}_${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── LLM Chat ── */

export function streamChat(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  return fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`Chat API ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          onChunk(line.slice(6));
        }
      }
    }
  });
}

/* ── Concessões ── */

export interface ConcessoesFilters {
  search?: string;
  regime?: string[];
  categoria?: string[];
  substancia?: string[];
  municipio?: string[];
  cfem_status?: "ativo" | "inativo";
  estrategico?: boolean;
  uf?: string;
  limit?: number;
  offset?: number;
}

export interface ConcessoesStats {
  total: number;
  cfem_ativas: number | null;
  substancias: number;
  municipios: number;
}

export interface ConcessoesFilterOptions {
  regimes: string[];
  categorias: string[];
  substancias: string[];
  municipios: string[];
  ufs: string[];
  pipeline: Record<string, number>;
  regime_labels: Record<string, string>;
  view: string;
}

export interface ConcessoesResponse {
  view: string;
  total: number;
  limit: number;
  offset: number;
  regime_labels: Record<string, string>;
  rows: Record<string, unknown>[];
}

/** Shared QS builder for mining filter endpoints (concessoes, geo, prospeccao). */
function miningFilterQS(params?: {
  search?: string;
  regime?: string[];
  categoria?: string[];
  substancia?: string[];
  municipio?: string[];
  cfem_status?: string;
  estrategico?: boolean;
  uf?: string;
  limit?: number;
  offset?: number;
}): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  params.regime?.forEach((v) => qs.append("regime", v));
  params.categoria?.forEach((v) => qs.append("categoria", v));
  params.substancia?.forEach((v) => qs.append("substancia", v));
  params.municipio?.forEach((v) => qs.append("municipio", v));
  if (params.cfem_status) qs.set("cfem_status", params.cfem_status);
  if (params.estrategico != null) qs.set("estrategico", String(params.estrategico));
  if (params.uf) qs.set("uf", params.uf);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return q ? `?${q}` : "";
}

function concessoesQS(params?: ConcessoesFilters): string {
  return miningFilterQS(params);
}

export function fetchConcessoesFilters() {
  return apiFetch<ConcessoesFilterOptions>("/concessoes/filters");
}

export function fetchConcessoesStats(params?: ConcessoesFilters) {
  return apiFetch<ConcessoesStats>(`/concessoes/stats${concessoesQS(params)}`);
}

export function fetchConcessoes(params?: ConcessoesFilters) {
  return apiFetch<ConcessoesResponse>(`/concessoes${concessoesQS(params)}`);
}

export function fetchConcessaoDetail(processo: string) {
  return apiFetch<Record<string, unknown>>(`/concessoes/detail?processo=${encodeURIComponent(processo)}`);
}

export function concessoesExportUrl(params?: ConcessoesFilters): string {
  return `${API_BASE}/concessoes/export.csv${miningFilterQS(params)}`;
}

/* ── Prospecção ── */

export interface ProspeccaoFilters {
  min_score?: number;
  regime?: string[];
  categoria?: string[];
  estrategico?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProspeccaoOpportunity {
  processo_norm: string;
  regime: string;
  titular: string;
  substancia_principal: string;
  municipio_principal: string;
  categoria: string;
  AREA_HA: number;
  ativo_cfem: boolean;
  cfem_total: number;
  estrategico: string;
  score: number;
  motivo: string;
}

export interface ProspeccaoResponse {
  total: number;
  limit: number;
  offset: number;
  stats: {
    total: number;
    avg_score: number;
    strategic_count: number;
    total_area: number;
  };
  rows: ProspeccaoOpportunity[];
}

export interface EmpresaPortfolio {
  titular: string;
  total_concessoes: number;
  substancias_distintas: number;
  ativas_cfem: number;
  inativas: number;
  cfem_total: number;
  area_total: number;
}

export interface MunicipioConcentration {
  municipio: string;
  substancia: string;
  concessoes: number;
  ativas: number;
  area_total: number;
  cfem_total: number;
}

function prospeccaoQS(params?: ProspeccaoFilters): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.min_score != null) qs.set("min_score", String(params.min_score));
  params.regime?.forEach((v) => qs.append("regime", v));
  params.categoria?.forEach((v) => qs.append("categoria", v));
  if (params.estrategico != null) qs.set("estrategico", String(params.estrategico));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return q ? `?${q}` : "";
}

export function fetchOpportunities(params?: ProspeccaoFilters) {
  return apiFetch<ProspeccaoResponse>(`/prospeccao/opportunities${prospeccaoQS(params)}`);
}

export function fetchEmpresaPortfolios() {
  return apiFetch<{ stats: Record<string, unknown>; rows: EmpresaPortfolio[] }>("/prospeccao/empresas");
}

export function fetchMunicipioConcentration() {
  return apiFetch<{ total: number; rows: MunicipioConcentration[] }>("/prospeccao/municipios");
}

export function fetchScoreBreakdown() {
  return apiFetch<{ max_score: number; criteria: { criterion: string; points: number }[] }>("/prospeccao/score-breakdown");
}

export interface EmpresaConcessao {
  processo_norm: string;
  regime: string;
  substancia_principal: string;
  municipio_principal: string;
  categoria: string;
  AREA_HA: number | null;
  ativo_cfem: boolean;
  cfem_total: number | null;
}

export function fetchEmpresaConcessoes(titular: string) {
  return apiFetch<{ titular: string; total: number; rows: EmpresaConcessao[] }>(
    `/prospeccao/empresas/${encodeURIComponent(titular)}/concessoes`
  );
}

/* ── Geospatial ── */

export interface GeoConcessoesResponse {
  total: number;
  returned: number;
  truncated: boolean;
  enriched: boolean;
  geojson: GeoJSON.FeatureCollection;
}

export interface GeoStats {
  total_polygons: number;
  total_all: number;
  enriched: boolean;
  enriched_count?: number;
  distinct_substances?: number;
  total_area_ha?: number;
}

export interface GeoFilterOptions {
  options: {
    regimes: string[];
    categorias: string[];
    substancias: string[];
    fases?: string[];
  };
  color_palettes: {
    categoria: Record<string, string>;
    regime: Record<string, string>;
    fase: Record<string, string>;
  };
}

function geoQS(params?: {
  regime?: string[];
  categoria?: string[];
  substancia?: string[];
  cfem_status?: string;
  estrategico?: boolean;
  limit?: number;
}): string {
  return miningFilterQS(params);
}

export function fetchGeoConcessoes(params?: Parameters<typeof geoQS>[0]) {
  return apiFetch<GeoConcessoesResponse>(`/geo/concessoes${geoQS(params)}`);
}

export function fetchGeoStats(params?: Parameters<typeof geoQS>[0]) {
  return apiFetch<GeoStats>(`/geo/concessoes/stats${geoQS(params)}`);
}

export function fetchGeoFilters() {
  return apiFetch<GeoFilterOptions>("/geo/concessoes/filters");
}

export function fetchGeoLayer(layer: "ucs" | "tis") {
  return apiFetch<GeoJSON.FeatureCollection>(`/geo/layers/${layer}`);
}

/* ── Intelligence (Market Data) ── */

export interface PtaxResponse {
  rows: { data: string; cotacao_venda: number }[];
  latest: { data: string; cotacao_venda: number } | null;
  total: number;
}

export function fetchPtax() {
  return apiFetch<PtaxResponse>("/intelligence/ptax");
}

export interface CommodityResponse {
  rows: Record<string, string>[];
  minerals: string[];
  latest: Record<string, Record<string, string>>;
}

export function fetchCommodities() {
  return apiFetch<CommodityResponse>("/intelligence/commodities");
}

export function fetchComexYearly() {
  return apiFetch<{ rows: { ano: number; fluxo: string; valor_fob_usd: number }[] }>("/intelligence/comex/yearly");
}

export function fetchComexByUF() {
  return apiFetch<{ rows: { uf: string; valor_fob_usd: number }[] }>("/intelligence/comex/by-uf");
}

export function fetchCfemTopMunicipios() {
  return apiFetch<{ rows: { municipio: string; total: number }[] }>("/intelligence/cfem/top-municipios");
}

export function fetchCfemTopSubstancias() {
  return apiFetch<{ rows: { substancia: string; total: number }[] }>("/intelligence/cfem/top-substancias");
}

export function fetchRalTopSubstancias() {
  return apiFetch<{ rows: { substancia: string; n: number }[] }>("/intelligence/ral/top-substancias");
}

export function fetchAnmByFase() {
  return apiFetch<{ rows: { fase: string; n: number }[] }>("/intelligence/anm/by-fase");
}

export function fetchAnmBySubstancia() {
  return apiFetch<{ rows: { substancia: string; n: number }[] }>("/intelligence/anm/by-substancia");
}

export function fetchAnmStats() {
  return apiFetch<{ total_records: number }>("/intelligence/anm/stats");
}

/* ── Intelligence v2 (KPI, Time-Series, AI) ── */

export interface KpiItem {
  latest: number;
  delta: number;
  sparkline: number[];
  date?: string;
  unit?: string;
  valor_usd?: number;
  valor_brl?: number;
  delta_yoy?: number;
}

export interface KpiSummaryResponse {
  usd_brl: KpiItem | null;
  ferro: KpiItem | null;
  balanca_ytd: KpiItem | null;
  cfem_ytd: KpiItem | null;
  freshness: Record<string, string>;
}

export function fetchKpiSummary() {
  return apiFetch<KpiSummaryResponse>("/intelligence/kpi-summary");
}

export interface CfemTimeRow {
  ano: number;
  mes: number;
  total: number;
}

export function fetchCfemTimeSeries(params?: {
  ano_min?: number;
  ano_max?: number;
  substancia?: string;
  municipio?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.ano_min) qs.set("ano_min", String(params.ano_min));
  if (params?.ano_max) qs.set("ano_max", String(params.ano_max));
  if (params?.substancia) qs.set("substancia", params.substancia);
  if (params?.municipio) qs.set("municipio", params.municipio);
  const q = qs.toString();
  return apiFetch<{ rows: CfemTimeRow[] }>(`/intelligence/cfem/time-series${q ? `?${q}` : ""}`);
}

export function fetchComexByCountry(fluxo = "Exportação", limit = 10) {
  return apiFetch<{ fluxo: string; rows: { pais: string; valor_fob_usd: number; peso_kg: number }[] }>(
    `/intelligence/comex/by-country?fluxo=${encodeURIComponent(fluxo)}&limit=${limit}`
  );
}

export function fetchComexMonthly(ano_min = 2021, ano_max = 2026) {
  return apiFetch<{ rows: { ano: number; mes: number; fluxo: string; valor_fob_usd: number }[] }>(
    `/intelligence/comex/monthly?ano_min=${ano_min}&ano_max=${ano_max}`
  );
}

export function fetchRalTopSubstanciasValue(limit = 10) {
  return apiFetch<{ rows: { substancia: string; valor_venda: number; qtd_producao: number }[] }>(
    `/intelligence/ral/top-substancias-value?limit=${limit}`
  );
}

export function fetchStrategicMinerals() {
  return apiFetch<{ rows: { substancia: string; categoria: string; valor_relativo: string; estrategico: string }[] }>(
    "/intelligence/minerals/strategic"
  );
}

export function fetchCommodityTimeSeries(mineral?: string) {
  const qs = mineral ? `?mineral=${encodeURIComponent(mineral)}` : "";
  return apiFetch<{
    rows: Record<string, unknown>[];
    minerals: string[];
  }>(`/intelligence/commodities/time-series${qs}`);
}

export interface RegulatorySignal {
  key: string;
  label: string;
  value: number;
  unit?: string;
  total?: number;
  year?: number;
  delta_pct?: number | null;
  fonte: string;
}

export function fetchRegulatoryPulse() {
  return apiFetch<{ signals: RegulatorySignal[] }>(
    "/intelligence/regulatory-pulse"
  );
}

export function fetchIbamaInfracoesTrend() {
  return apiFetch<{ rows: { ano: number; total: number }[] }>(
    "/intelligence/ibama/infracoes-trend"
  );
}

export function fetchSemadLicensingTrend() {
  return apiFetch<{
    rows: {
      ano: number;
      total: number;
      aprovados: number;
      indeferidos: number;
      taxa_aprovacao: number;
    }[];
  }>("/intelligence/semad/licensing-trend");
}

export interface BriefingSection {
  title: string;
  content: string;
}

export interface BriefingResponse {
  sections: BriefingSection[];
  generated_at: string | null;
  status: "ready" | "generating";
}

export function fetchBriefing() {
  return apiFetch<BriefingResponse>("/intelligence/briefing");
}

export function refreshBriefing() {
  return apiFetch<{ status: string }>("/intelligence/briefing/refresh", {
    method: "POST",
  });
}

/* ── Simulator (Mineradora Modelo) ── */

export interface SimKPI {
  nome: string;
  unidade: string;
  target: number;
  min_val: number;
  max_val: number;
  current: number;
  previous: number;
  delta: number;
  series: {
    data: string[];
    valor: number[];
  };
}

export interface SimSetorResponse {
  setor: string;
  kpis: SimKPI[];
  disclaimer: string;
}

export interface SimSetoresResponse {
  setores: Record<string, { nome: string; unidade: string; target: number; min_val: number; max_val: number }[]>;
  disclaimer: string;
}

export function fetchSimSetores() {
  return apiFetch<SimSetoresResponse>("/simulator/setores");
}

export function fetchSimSetor(setor: string) {
  return apiFetch<SimSetorResponse>(`/simulator/setores/${encodeURIComponent(setor)}`);
}

/* ── Viabilidade ── */

export interface ViabilidadeStats {
  total: number;
  deferidos: number;
  indeferidos: number;
  arquivamentos: number;
  taxa_aprovacao: number;
}

export interface CasoSimilar {
  detail_id: number;
  empreendimento: string;
  municipio: string;
  cnpj_cpf: string;
  atividade: string;
  classe: number;
  regional: string;
  modalidade: string;
  decisao: string;
  ano: number;
  data_de_publicacao: string;
  texto_chars: number;
}

export interface ViabilidadeResponse {
  stats: ViabilidadeStats;
  media_geral: number;
  casos_similares: CasoSimilar[];
}

export function fetchAtividades() {
  return apiFetch<string[]>("/consulta/atividades");
}

export function fetchRegionais() {
  return apiFetch<string[]>("/consulta/regionais");
}

export function fetchViabilidade(params: {
  atividade?: string;
  classe?: number;
  regional?: string;
  cnpj?: string;
}) {
  const qs = new URLSearchParams();
  if (params.atividade) qs.set("atividade", params.atividade);
  if (params.classe != null) qs.set("classe", String(params.classe));
  if (params.regional) qs.set("regional", params.regional);
  if (params.cnpj) qs.set("cnpj", params.cnpj);
  const q = qs.toString();
  return apiFetch<ViabilidadeResponse>(`/consulta/viabilidade${q ? `?${q}` : ""}`);
}

/* ── COPAM ── */

export interface CopamMeeting {
  data: string;
  titulo: string;
  total_documents: number;
  documents_str: string | null;
  municipio: string | null;
  sede: string | null;
}

export interface CopamStats {
  total_reunioes: number;
  total_documentos: number;
  ultima_reuniao: string | null;
}

export interface CopamResponse {
  total: number;
  limit: number;
  offset: number;
  stats: CopamStats;
  rows: CopamMeeting[];
}

export function fetchCopamMeetings(limit = 200, offset = 0) {
  return apiFetch<CopamResponse>(`/copam?limit=${limit}&offset=${offset}`);
}

/* ── Top Empresas (for Caso Detalhado) ── */

export interface TopEmpresa {
  cnpj_cpf: string;
  empreendimento: string;
  n: number;
}

export function fetchTopEmpresas() {
  return apiFetch<TopEmpresa[]>("/decisions/top-empresas");
}

/* ── Decisions: filtered endpoints ── */

export interface DecisionFilters {
  regional?: string;
  modalidade?: string;
  classe?: number;
  atividade?: string;
  decisao?: string;
  ano_min?: number;
  ano_max?: number;
  mining_only?: boolean;
}

function filtersToParams(f: DecisionFilters): string {
  const p = new URLSearchParams();
  if (f.regional) p.set("regional", f.regional);
  if (f.modalidade) p.set("modalidade", f.modalidade);
  if (f.classe != null) p.set("classe", String(f.classe));
  if (f.atividade) p.set("atividade", f.atividade);
  if (f.decisao) p.set("decisao", f.decisao);
  if (f.ano_min != null) p.set("ano_min", String(f.ano_min));
  if (f.ano_max != null) p.set("ano_max", String(f.ano_max));
  if (f.mining_only) p.set("mining_only", "true");
  const s = p.toString();
  return s ? `?${s}` : "";
}

export interface FilterOptions {
  regional: string[];
  modalidade: string[];
  classe: number[];
  atividade_tipologia: { letra: string; label: string; n: number }[];
  decisao: string[];
  anos: string[];
}

export function fetchDecisionFilterOptions() {
  return apiFetch<FilterOptions>("/decisions/filter-options");
}

export interface DecisionSummary {
  total: number;
  deferidos: number;
  indeferidos: number;
  arquivamentos: number;
  taxa_aprovacao: number;
}

export function fetchDecisionSummary(filters: DecisionFilters = {}) {
  return apiFetch<DecisionSummary>(`/decisions/summary${filtersToParams(filters)}`);
}

export interface LicensingProfile {
  atividade: string;
  classe: number | null;
  regional: string | null;
  n_decisoes: number;
  probabilidade_aprovacao: number | null;
  media_geral: number;
  rigor_regional_delta: number | null;
  tendencia_3anos: number | null;
}

export function fetchLicensingProfile(atividade: string, classe?: number, regional?: string) {
  const p = new URLSearchParams({ atividade });
  if (classe != null) p.set("classe", String(classe));
  if (regional) p.set("regional", regional);
  return apiFetch<LicensingProfile>(`/decisions/profile?${p}`);
}

export interface ContextualInsight {
  tipo: string;
  titulo: string;
  descricao: string;
}

export function fetchDecisionInsights(filters: DecisionFilters = {}) {
  return apiFetch<ContextualInsight[]>(`/decisions/insights${filtersToParams(filters)}`);
}

export function fetchDecisionSummaryByRegional(filters: DecisionFilters = {}) {
  return apiFetch<Record<string, unknown>[]>(`/decisions/by-regional${filtersToParams(filters)}`);
}

export function fetchDecisionSummaryByClasse(filters: DecisionFilters = {}) {
  return apiFetch<Record<string, unknown>[]>(`/decisions/by-classe${filtersToParams(filters)}`);
}

export function fetchDecisionTrend(filters: DecisionFilters = {}) {
  return apiFetch<Record<string, unknown>[]>(`/decisions/trend${filtersToParams(filters)}`);
}

/* ── Formatting re-exports (canonical source: lib/format.ts) ── */

/* ── Monitoramento ── */

export interface MonitoringEmpresa {
  cnpj: string;
  empresa: string;
  total_processos: number;
  pesquisas: number;
  lavras: number;
  substancia_exemplo: string;
  cfem_total: number;
}

export function fetchMonitoringTopEmpresas(limit = 20) {
  return apiFetch<MonitoringEmpresa[]>(`/intelligence/monitoring/top-empresas?limit=${limit}`);
}

export interface PipelineItem {
  fase_atual: string;
  n: number;
}

export function fetchMonitoringPipeline() {
  return apiFetch<PipelineItem[]>("/intelligence/monitoring/pipeline");
}

export interface ProjetoDestaque {
  id: string;
  empresa: string;
  cnpj: string | null;
  projeto: string;
  substancia: string;
  categoria: string;
  localizacao: { municipio: string | null; uf: string };
  investimento_valor: number | null;
  investimento_moeda: string;
  status: string;
  detalhe_status: string;
  previsao: string;
  capacidade: string | null;
  licenciamento: string;
  fontes: { titulo: string; url: string; data: string }[];
  atualizado_em: string;
}

export interface ProjetosResponse {
  total: number;
  atualizado_em: string;
  projetos: ProjetoDestaque[];
}

export function fetchMonitoringProjetos() {
  return apiFetch<ProjetosResponse>("/intelligence/monitoring/projetos");
}

/* ── Formatting re-exports (canonical source: lib/format.ts) ── */

export { fmtReais, fmtPct, fmtBR as fmtNumber } from "./format";
