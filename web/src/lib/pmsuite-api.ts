const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${res.statusText}${text ? ` — ${text}` : ""}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Charter {
  id: number;
  projeto_id: number;
  justificativa?: string | null;
  business_case?: string | null;
  objetivo_smart?: string | null;
  beneficios_esperados?: string | null;
  escopo_incluido?: string | null;
  escopo_excluido?: string | null;
  entregaveis_principais?: string | null;
  premissas?: string | null;
  restricoes?: string | null;
  criterios_sucesso?: string | null;
  criterios_aceitacao?: string | null;
  orcamento_total?: number | null;
  orcamento_contingencia?: number | null;
  moeda?: string;
  data_aprovacao?: string | null;
  data_inicio_prevista?: string | null;
  data_termino_prevista?: string | null;
  sponsor_nome?: string | null;
  gerente_projeto_nome?: string | null;
  aprovador_nome?: string | null;
  comite_steering?: string | null;
  versao?: number;
  status?: string;
}

export interface WBSNode {
  id: number;
  projeto_id: number;
  parent_id?: number | null;
  codigo_wbs: string;
  nome: string;
  descricao?: string | null;
  nivel: number;
  tipo: string;
  responsavel_nome?: string | null;
  orcamento_estimado?: number | null;
  duracao_dias_estimada?: number | null;
  data_inicio_planejada?: string | null;
  data_termino_planejada?: string | null;
  is_critico: boolean;
  is_long_lead: boolean;
  is_marco: boolean;
  is_terceirizado: boolean;
  disciplina_epcm?: string | null;
  executor?: string | null;
  is_servico_contratado: boolean;
  ciclo_suprimentos_dias?: number | null;
  ciclo_mobilizacao_dias?: number | null;
  percentual_concluido: number;
  status: string;
  ordem: number;
  children?: WBSNode[];
}

export interface Baseline {
  id: number;
  versao: number;
  nome: string;
  descricao?: string | null;
  data_aprovacao: string;
  orcamento?: number | null;
  data_inicio?: string | null;
  data_termino?: string | null;
  ativa: boolean;
  aprovador_nome?: string | null;
  motivo?: string | null;
}

export interface ChangeRequest {
  id: number;
  projeto_id: number;
  codigo: string;
  titulo: string;
  descricao?: string | null;
  justificativa?: string | null;
  categoria: string;
  origem?: string | null;
  impacto_escopo?: string | null;
  impacto_cronograma_dias?: number | null;
  impacto_custo?: number | null;
  impacto_qualidade?: string | null;
  impacto_risco?: string | null;
  status: string;
  prioridade: string;
  solicitante_nome?: string | null;
  aprovador_nome?: string | null;
  data_abertura: string;
  data_decisao?: string | null;
  decisao?: string | null;
}

export interface Decision {
  id: number;
  codigo?: string | null;
  titulo: string;
  contexto?: string | null;
  alternativas_consideradas?: string | null;
  decisao: string;
  rationale?: string | null;
  impactos?: string | null;
  decisor_nome?: string | null;
  data_decisao: string;
  forum?: string | null;
  stakeholders_envolvidos?: string | null;
}

export interface WBSRiscoItem {
  id: number;
  codigo_wbs: string;
  nome: string;
  nivel: number;
  tipo: string;
  is_critico: boolean;
  is_servico_contratado: boolean;
  executor?: string | null;
  n_riscos: number;
  riscos_por_classificacao: Record<string, number>;
  riscos: { id: number; codigo: string; nome: string; classificacao_residual?: string | null }[];
}

export interface ProjetoResumo {
  projeto: {
    id: number;
    codigo: string;
    nome: string;
    descricao?: string | null;
    status: string;
    data_inicio?: string | null;
    data_fim?: string | null;
    owner_nome?: string | null;
    orcamento?: number | null;
  };
  charter_existe: boolean;
  charter_status?: string | null;
  wbs_total_nodes: number;
  wbs_marcos: number;
  wbs_criticos: number;
  wbs_long_leads: number;
  wbs_servicos_contratados: number;
  por_disciplina_epcm: Record<string, number>;
  por_executor: Record<string, number>;
  total_riscos: number;
  riscos_com_wbs: number;
  total_crs: number;
  crs_abertas: number;
  total_decisoes: number;
  proximos_marcos: {
    codigo: string;
    nome: string;
    data?: string | null;
    is_terceirizado: boolean;
  }[];
}

export const EXECUTOR_COR: Record<string, string> = {
  terceiro: "#dc2626",
  gerenciadora: "#a855f7",
  interno: "#16a34a",
  hibrido: "#0ea5e9",
};

export const EPCM_COR: Record<string, string> = {
  E: "#0ea5e9",
  P: "#16a34a",
  C: "#f59e0b",
  M: "#dc2626",
};

export const EPCM_LABEL: Record<string, string> = {
  E: "Engenharia",
  P: "Suprimentos",
  C: "Construção",
  M: "Montagem",
};

export const fetchProjetoResumo = (id: number) =>
  apiFetch<ProjetoResumo>(`/pmsuite/projetos/${id}/resumo`);

export const fetchCharter = (projetoId: number) =>
  apiFetch<Charter>(`/pmsuite/projetos/${projetoId}/charter`);

export const fetchBaselines = (projetoId: number) =>
  apiFetch<Baseline[]>(`/pmsuite/projetos/${projetoId}/baselines`);

export const fetchWBSTree = (projetoId: number) =>
  apiFetch<WBSNode[]>(`/pmsuite/projetos/${projetoId}/wbs`);

export const fetchWBSFlat = (
  projetoId: number,
  filtros: { apenas_servicos_contratados?: boolean; apenas_criticos?: boolean } = {},
) => {
  const qs = Object.entries(filtros)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return apiFetch<WBSNode[]>(`/pmsuite/projetos/${projetoId}/wbs/flat${qs ? "?" + qs : ""}`);
};

export const fetchWBSMatrizRiscos = (projetoId: number) =>
  apiFetch<WBSRiscoItem[]>(`/pmsuite/projetos/${projetoId}/wbs/matriz-riscos`);

export const fetchChangeRequests = (projetoId: number) =>
  apiFetch<ChangeRequest[]>(`/pmsuite/projetos/${projetoId}/change-requests`);

export const fetchDecisoes = (projetoId: number) =>
  apiFetch<Decision[]>(`/pmsuite/projetos/${projetoId}/decisoes`);

// ========== M3 Cronograma ==========

export interface CronogramaNode {
  id: number;
  codigo_wbs: string;
  nome: string;
  nivel: number;
  tipo: string;
  is_marco: boolean;
  is_critico: boolean;
  is_long_lead: boolean;
  is_terceirizado: boolean;
  disciplina_epcm?: string | null;
  executor?: string | null;
  duracao_dias?: number | null;
  inicio_cedo?: string | null;
  termino_cedo?: string | null;
  inicio_tarde?: string | null;
  termino_tarde?: string | null;
  folga_total_dias?: number | null;
  caminho_critico: boolean;
  percentual_concluido: number;
}

export interface Dependencia {
  id: number;
  predecessor_id: number;
  sucessor_id: number;
  tipo: string;
  lag_dias: number;
}

export interface Cronograma {
  data_inicio?: string | null;
  data_termino?: string | null;
  nodes: CronogramaNode[];
  dependencias: Dependencia[];
}

export const fetchCronograma = (projetoId: number) =>
  apiFetch<Cronograma>(`/pmsuite/projetos/${projetoId}/cronograma`);

export const recalcularCPM = (projetoId: number) =>
  apiFetch<{ nos_processados: number; nos_criticos: number; data_termino_projeto: string }>(
    `/pmsuite/projetos/${projetoId}/cronograma/calcular`,
    { method: "POST" },
  );

// ========== M4 Custos & EVM ==========

export interface CostCategory {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
  cor?: string | null;
  ordem: number;
  orcamento_planejado?: number | null;
  orcamento_comprometido?: number | null;
  valor_realizado?: number | null;
  pct_comprometido?: number;
  pct_realizado?: number;
}

export interface EVMSnapshot {
  id: number;
  data_snapshot: string;
  periodo?: string | null;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  sv?: number | null;
  cv?: number | null;
  spi?: number | null;
  cpi?: number | null;
  eac?: number | null;
  etc?: number | null;
  vac?: number | null;
  observacoes?: string | null;
}

export const fetchCostCategories = (projetoId: number) =>
  apiFetch<CostCategory[]>(`/pmsuite/projetos/${projetoId}/custos/categorias`);

export const fetchEVMSnapshots = (projetoId: number) =>
  apiFetch<EVMSnapshot[]>(`/pmsuite/projetos/${projetoId}/custos/evm`);

// ============================================================================
// M5 — Gestão da Qualidade
// ============================================================================

export interface RequisitoQualidade {
  id: number;
  projeto_id: number;
  wbs_node_id?: number | null;
  codigo: string;
  titulo: string;
  descricao?: string | null;
  categoria: string;
  norma_referencia?: string | null;
  criterio_aceitacao?: string | null;
  metodo_verificacao?: string | null;
  criticidade: string;
  mandatorio: boolean;
  responsavel_id?: number | null;
  status: string;
}

export interface InspecaoQualidade {
  id: number;
  projeto_id: number;
  requisito_id?: number | null;
  requisito_codigo?: string | null;
  wbs_node_id?: number | null;
  codigo: string;
  titulo: string;
  descricao?: string | null;
  tipo: string;
  fase?: string | null;
  data_planejada?: string | null;
  data_execucao?: string | null;
  inspetor_id?: number | null;
  resultado: string;
  observacoes?: string | null;
  evidencia_url?: string | null;
}

export interface NaoConformidade {
  id: number;
  projeto_id: number;
  inspecao_id?: number | null;
  inspecao_codigo?: string | null;
  requisito_id?: number | null;
  requisito_codigo?: string | null;
  wbs_node_id?: number | null;
  risco_id?: number | null;
  codigo: string;
  titulo: string;
  descricao?: string | null;
  severidade: string;
  tipo: string;
  origem_deteccao?: string | null;
  problema_observado?: string | null;
  why_1?: string | null;
  why_2?: string | null;
  why_3?: string | null;
  why_4?: string | null;
  why_5?: string | null;
  causa_raiz?: string | null;
  categoria_causa?: string | null;
  acao_imediata?: string | null;
  acao_corretiva_id?: number | null;
  acao_preventiva_id?: number | null;
  status: string;
  data_abertura: string;
  data_encerramento?: string | null;
  prazo_tratamento?: string | null;
  custo_impacto?: number | null;
  responsavel_id?: number | null;
  aprovador_id?: number | null;
}

export interface AuditoriaQualidade {
  id: number;
  projeto_id: number;
  codigo: string;
  titulo: string;
  escopo?: string | null;
  criterios?: string | null;
  tipo: string;
  data_planejada?: string | null;
  data_execucao_inicio?: string | null;
  data_execucao_fim?: string | null;
  auditor_lider_id?: number | null;
  equipe_auditoria?: string | null;
  organizacao_auditora?: string | null;
  status: string;
  resultado?: string | null;
  conformidade_pct?: number | null;
  ncs_abertas: number;
  pontos_melhoria: number;
  resumo_executivo?: string | null;
  relatorio_url?: string | null;
}

export interface MetricaQualidade {
  id: number;
  projeto_id: number;
  data_snapshot: string;
  periodo?: string | null;
  inspecoes_planejadas: number;
  inspecoes_executadas: number;
  inspecoes_aprovadas: number;
  first_pass_yield?: number | null;
  ncs_abertas: number;
  ncs_encerradas: number;
  ncs_criticas_abertas: number;
  tempo_medio_encerramento_dias?: number | null;
  auditorias_planejadas: number;
  auditorias_executadas: number;
  conformidade_media_pct?: number | null;
  custo_nao_qualidade?: number | null;
  observacoes?: string | null;
}

export interface QualityDashboard {
  projeto_id: number;
  kpis: {
    requisitos_total: number;
    requisitos_mandatorios: number;
    inspecoes_total: number;
    inspecoes_aprovadas: number;
    inspecoes_reprovadas: number;
    inspecoes_pendentes: number;
    first_pass_yield?: number | null;
    ncs_total: number;
    ncs_abertas: number;
    ncs_criticas_abertas: number;
    ncs_encerradas: number;
    custo_nao_qualidade_total: number;
    auditorias_total: number;
    auditorias_concluidas: number;
    conformidade_media_pct?: number | null;
  };
  distribuicao_severidade: Record<string, number>;
  distribuicao_causa_ishikawa: Record<string, number>;
  requisitos_por_criticidade: Record<string, number>;
  metricas_historico: MetricaQualidade[];
}

export const fetchQualityDashboard = (projetoId: number) =>
  apiFetch<QualityDashboard>(`/quality/projetos/${projetoId}/dashboard`);

export const fetchRequisitos = (projetoId: number) =>
  apiFetch<RequisitoQualidade[]>(`/quality/projetos/${projetoId}/requisitos`);

export const fetchInspecoes = (projetoId: number) =>
  apiFetch<InspecaoQualidade[]>(`/quality/projetos/${projetoId}/inspecoes`);

export const fetchNCs = (projetoId: number) =>
  apiFetch<NaoConformidade[]>(`/quality/projetos/${projetoId}/ncs`);

export const fetchAuditorias = (projetoId: number) =>
  apiFetch<AuditoriaQualidade[]>(`/quality/projetos/${projetoId}/auditorias`);

export const fetchMetricasQualidade = (projetoId: number) =>
  apiFetch<MetricaQualidade[]>(`/quality/projetos/${projetoId}/metricas`);

// ============================================================================
// M9 — Aquisições / Procurement
// ============================================================================

export interface Fornecedor {
  id: number;
  codigo: string;
  razao_social: string;
  cnpj?: string | null;
  pais: string;
  categoria: string;
  disciplina_epcm?: string | null;
  porte: string;
  tipo_contratacao: string;
  status_homologacao: string;
  data_homologacao?: string | null;
  validade_homologacao?: string | null;
  rating_tecnico?: number | null;
  rating_comercial?: number | null;
  rating_sustentabilidade?: number | null;
  observacoes?: string | null;
  contato_nome?: string | null;
  contato_email?: string | null;
}

export interface RFPItem {
  id: number;
  projeto_id: number;
  wbs_node_id?: number | null;
  codigo: string;
  titulo: string;
  descricao?: string | null;
  categoria: string;
  disciplina_epcm?: string | null;
  data_et_emitida?: string | null;
  data_rfp_publicada?: string | null;
  data_propostas_recebidas?: string | null;
  data_analise_tecnica_ok?: string | null;
  data_negociacao_comercial_ok?: string | null;
  data_adjudicacao?: string | null;
  data_contrato_assinado?: string | null;
  prazo_padrao_dias: number;
  ciclo_real_dias?: number | null;
  fornecedores_convidados: number;
  propostas_recebidas: number;
  propostas_validas: number;
  vencedor_id?: number | null;
  vencedor_razao?: string | null;
  valor_estimado?: number | null;
  valor_adjudicado?: number | null;
  moeda: string;
  status: string;
  observacoes?: string | null;
}

export interface Contrato {
  id: number;
  projeto_id: number;
  wbs_node_id?: number | null;
  rfp_id?: number | null;
  fornecedor_id: number;
  fornecedor_razao?: string | null;
  fornecedor_codigo?: string | null;
  codigo: string;
  titulo: string;
  escopo?: string | null;
  tipo: string;
  modalidade?: string | null;
  data_assinatura?: string | null;
  data_inicio?: string | null;
  data_termino_prevista?: string | null;
  data_termino_real?: string | null;
  prazo_mobilizacao_dias: number;
  valor_original: number;
  valor_aditivos: number;
  valor_total: number;
  valor_realizado: number;
  percentual_valor_executado: number;
  moeda: string;
  garantias?: string | null;
  status: string;
  percentual_executado: number;
  qtd_aditivos: number;
  observacoes?: string | null;
}

export interface OrdemCompra {
  id: number;
  projeto_id: number;
  contrato_id?: number | null;
  wbs_node_id?: number | null;
  fornecedor_id: number;
  fornecedor_razao?: string | null;
  codigo: string;
  descricao?: string | null;
  data_emissao: string;
  data_entrega_prevista?: string | null;
  data_entrega_real?: string | null;
  quantidade?: number | null;
  unidade?: string | null;
  valor_total: number;
  moeda: string;
  status: string;
  e_long_lead: boolean;
  observacoes?: string | null;
}

export interface MarcoSuprimentos {
  id: number;
  projeto_id: number;
  wbs_node_id?: number | null;
  contrato_id?: number | null;
  codigo: string;
  titulo: string;
  tipo: string;
  data_planejada?: string | null;
  data_real?: string | null;
  desvio_dias?: number | null;
  status: string;
  observacoes?: string | null;
}

export interface ProcurementDashboard {
  projeto_id: number;
  kpis: {
    fornecedores_total: number;
    fornecedores_homologados: number;
    rfps_total: number;
    rfps_contratadas: number;
    rfps_em_andamento: number;
    ciclo_padrao_dias: number;
    ciclo_medio_real_dias?: number | null;
    aderencia_prazo_rfp?: number | null;
    contratos_total: number;
    contratos_em_execucao: number;
    valor_contratado_total: number;
    valor_realizado_contratos: number;
    valor_aditivos_total: number;
    pct_aditivos_sobre_original: number;
    pos_total: number;
    pos_long_lead: number;
    valor_long_lead: number;
    marcos_em_risco: number;
    marcos_atrasados: number;
  };
  distribuicao_homologacao: Record<string, number>;
  distribuicao_status_rfp: Record<string, number>;
  distribuicao_status_marcos: Record<string, number>;
  contratos_por_disciplina_epcm: Record<string, number>;
}

export const fetchProcurementDashboard = (projetoId: number) =>
  apiFetch<ProcurementDashboard>(`/procurement/projetos/${projetoId}/dashboard`);

export const fetchFornecedores = () =>
  apiFetch<Fornecedor[]>(`/procurement/fornecedores`);

export const fetchRFPs = (projetoId: number) =>
  apiFetch<RFPItem[]>(`/procurement/projetos/${projetoId}/rfps`);

export const fetchContratos = (projetoId: number) =>
  apiFetch<Contrato[]>(`/procurement/projetos/${projetoId}/contratos`);

export const fetchPOs = (projetoId: number) =>
  apiFetch<OrdemCompra[]>(`/procurement/projetos/${projetoId}/pos`);

export const fetchMarcosSuprimentos = (projetoId: number) =>
  apiFetch<MarcoSuprimentos[]>(`/procurement/projetos/${projetoId}/marcos`);
