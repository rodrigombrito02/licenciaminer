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
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${res.statusText}${text ? ` — ${text}` : ""}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type Classificacao = "PS" | "S" | "MS" | "C";

export const CLASSIFICACAO_ORDER: Classificacao[] = ["PS", "S", "MS", "C"];

export const CLASSIFICACAO_LABEL: Record<Classificacao, string> = {
  PS: "Pouco Significativo",
  S: "Significativo",
  MS: "Muito Significativo",
  C: "Crítico",
};

export const CLASSIFICACAO_COLOR: Record<Classificacao, string> = {
  PS: "#16a34a",
  S: "#eab308",
  MS: "#f97316",
  C: "#dc2626",
};

export interface EscalaProb {
  nivel: number;
  label: string;
  descricao?: string | null;
  frequencia_anual_min?: number | null;
  frequencia_anual_max?: number | null;
}

export interface EscalaImpacto {
  nivel: number;
  label: string;
  categoria: string;
  descricao?: string | null;
}

export interface MatrizCell {
  prob: number;
  impacto: number;
  classificacao: Classificacao;
}

export interface Metodologia {
  id: number;
  nome: string;
  descricao?: string | null;
  classificacao_labels: Record<string, string>;
  probabilidade: EscalaProb[];
  impacto: EscalaImpacto[];
  matriz: MatrizCell[];
}

export interface Categoria {
  id: number;
  nome: string;
  descricao?: string | null;
  cor?: string | null;
}

export interface Pessoa {
  id: number;
  nome: string;
  email?: string | null;
  area?: string | null;
  cargo?: string | null;
}

export interface UnidadeOrg {
  id: number;
  nome: string;
  parent_id?: number | null;
  nivel: number;
  tipo?: string | null;
}

export interface EloCadeiaValor {
  id: number;
  nome: string;
  descricao?: string | null;
  ordem: number;
  tipo: "primario" | "apoio";
}

export interface Risco {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  estagio?: string | null;
  categoria_id?: number | null;
  categoria_nome?: string | null;
  categoria_cor?: string | null;
  responsavel_id?: number | null;
  responsavel_nome?: string | null;
  unidade_org_id?: number | null;
  unidade_org_nome?: string | null;
  elo_cadeia_valor_id?: number | null;
  elo_cadeia_valor_nome?: string | null;
  prob_pura?: number | null;
  impacto_pura?: number | null;
  classificacao_pura?: Classificacao | null;
  prob_residual?: number | null;
  impacto_residual?: number | null;
  classificacao_residual?: Classificacao | null;
  created_at: string;
  updated_at: string;
}

export interface RiscoInput {
  codigo: string;
  nome: string;
  descricao?: string;
  estagio?: string;
  categoria_id?: number | null;
  responsavel_id?: number | null;
  unidade_org_id?: number | null;
  elo_cadeia_valor_id?: number | null;
  prob_pura?: number | null;
  impacto_pura?: number | null;
  prob_residual?: number | null;
  impacto_residual?: number | null;
}

export interface MatrizCellComRiscos {
  prob: number;
  impacto: number;
  classificacao: Classificacao;
  riscos: Risco[];
}

export interface UnidadeComRiscos extends UnidadeOrg {
  total_riscos: number;
  distribuicao: Record<string, number>;
}

export interface EloComRiscos extends EloCadeiaValor {
  total_riscos: number;
  distribuicao: Record<string, number>;
}

export interface DashboardKpis {
  total_riscos: number;
  por_classificacao_residual: Record<string, number>;
  por_classificacao_pura: Record<string, number>;
  por_estagio: Record<string, number>;
  por_categoria: Record<string, number>;
  acoes_total: number;
  acoes_atrasadas: number;
  controles_total: number;
}

export const fetchMetodologiaAtiva = () =>
  apiFetch<Metodologia>("/riscos/metodologia/ativa");

export const fetchCategorias = () => apiFetch<Categoria[]>("/riscos/categorias");

export const fetchPessoas = () => apiFetch<Pessoa[]>("/riscos/pessoas");

export const criarPessoa = (data: Omit<Pessoa, "id">) =>
  apiFetch<Pessoa>("/riscos/pessoas", { method: "POST", body: JSON.stringify(data) });

export const fetchUnidadesOrg = () => apiFetch<UnidadeOrg[]>("/riscos/unidades-org");

export const fetchCadeiaValor = () => apiFetch<EloCadeiaValor[]>("/riscos/cadeia-valor");

export interface RiscoFilters {
  estagio?: string;
  categoria_id?: number;
  classificacao?: string;
  responsavel_id?: number;
  unidade_org_id?: number;
  elo_cadeia_valor_id?: number;
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

export const fetchRiscos = (filters: RiscoFilters = {}) =>
  apiFetch<Risco[]>(`/riscos/riscos${qs(filters as Record<string, string | number | undefined>)}`);

export const fetchRisco = (id: number) => apiFetch<Risco>(`/riscos/riscos/${id}`);

export const criarRisco = (data: RiscoInput) =>
  apiFetch<Risco>("/riscos/riscos", { method: "POST", body: JSON.stringify(data) });

export const atualizarRisco = (id: number, data: Partial<RiscoInput>) =>
  apiFetch<Risco>(`/riscos/riscos/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const excluirRisco = (id: number) =>
  apiFetch<void>(`/riscos/riscos/${id}`, { method: "DELETE" });

export const fetchMatrizRiscos = (base: "pura" | "residual" = "residual") =>
  apiFetch<MatrizCellComRiscos[]>(`/riscos/riscos/matriz?base=${base}`);

export const fetchRiscosPorOrganograma = (base: "pura" | "residual" = "residual") =>
  apiFetch<UnidadeComRiscos[]>(`/riscos/riscos/por-organograma?base=${base}`);

export const fetchRiscosPorCadeiaValor = (base: "pura" | "residual" = "residual") =>
  apiFetch<EloComRiscos[]>(`/riscos/riscos/por-cadeia-valor?base=${base}`);

export const fetchDashboardKpis = () =>
  apiFetch<DashboardKpis>("/riscos/dashboard/kpis");

export interface ImportStats {
  arquivo: string;
  riscos: number;
  bowties: number;
  causas: number;
  consequencias: number;
  barreiras: number;
}

export const importarMusa = () =>
  apiFetch<ImportStats>("/riscos/importar-musa", { method: "POST" });

// ============================================================================
// Bowtie
// ============================================================================

export interface Barreira {
  id: number;
  descricao: string;
  efetividade?: number | null;
  ordem: number;
  controle_id?: number | null;
}

export interface Causa {
  id: number;
  bowtie_id: number;
  codigo: string;
  descricao: string;
  ordem: number;
  critica: boolean;
  barreiras: Barreira[];
}

export interface Consequencia {
  id: number;
  bowtie_id: number;
  codigo: string;
  descricao: string;
  ordem: number;
  critica: boolean;
  barreiras: Barreira[];
}

export interface Fator {
  id: number;
  bowtie_id: number;
  descricao: string;
  lado: "preventivo" | "corretivo";
  barreira_alvo_id?: number | null;
}

export interface Bowtie {
  id: number;
  risco_id: number;
  versao: number;
  top_event?: string | null;
  hazard?: string | null;
  canvas_json?: string | null;
  frequencia_pura?: number | null;
  frequencia_residual?: number | null;
  causas: Causa[];
  consequencias: Consequencia[];
  fatores: Fator[];
  created_at: string;
  updated_at: string;
}

export type BowtieState =
  | ({ exists: true } & Bowtie)
  | { exists: false; risco_id: number };

export interface BowtieInput {
  top_event?: string | null;
  hazard?: string | null;
  frequencia_pura?: number | null;
  frequencia_residual?: number | null;
  canvas_json?: string | null;
}

export interface CausaInput {
  codigo?: string;
  descricao?: string;
  ordem?: number;
  critica?: boolean;
}

export interface ConsequenciaInput {
  codigo?: string;
  descricao?: string;
  ordem?: number;
  critica?: boolean;
}

export interface BarreiraInput {
  descricao: string;
  efetividade?: number | null;
  ordem?: number;
  controle_id?: number | null;
}

export interface FatorInput {
  descricao: string;
  lado: "preventivo" | "corretivo";
  barreira_alvo_id?: number | null;
}

export const fetchBowtiePorRisco = (riscoId: number) =>
  apiFetch<BowtieState>(`/riscos/bowties/por-risco/${riscoId}`);

export const criarBowtie = (riscoId: number, data: BowtieInput) =>
  apiFetch<Bowtie>(`/riscos/bowties/por-risco/${riscoId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const atualizarBowtie = (bowtieId: number, data: BowtieInput) =>
  apiFetch<Bowtie>(`/riscos/bowties/${bowtieId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const adicionarCausa = (bowtieId: number, data: CausaInput) =>
  apiFetch<Causa>(`/riscos/bowties/${bowtieId}/causas`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const atualizarCausa = (causaId: number, data: CausaInput) =>
  apiFetch<Causa>(`/riscos/causas/${causaId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const excluirCausa = (causaId: number) =>
  apiFetch<void>(`/riscos/causas/${causaId}`, { method: "DELETE" });

export const adicionarConsequencia = (bowtieId: number, data: ConsequenciaInput) =>
  apiFetch<Consequencia>(`/riscos/bowties/${bowtieId}/consequencias`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const atualizarConsequencia = (id: number, data: ConsequenciaInput) =>
  apiFetch<Consequencia>(`/riscos/consequencias/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const excluirConsequencia = (id: number) =>
  apiFetch<void>(`/riscos/consequencias/${id}`, { method: "DELETE" });

export const adicionarBarreiraPreventiva = (causaId: number, data: BarreiraInput) =>
  apiFetch<Barreira>(`/riscos/causas/${causaId}/barreiras`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const atualizarBarreiraPreventiva = (id: number, data: BarreiraInput) =>
  apiFetch<Barreira>(`/riscos/barreiras-preventivas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const excluirBarreiraPreventiva = (id: number) =>
  apiFetch<void>(`/riscos/barreiras-preventivas/${id}`, { method: "DELETE" });

export const adicionarBarreiraCorretiva = (
  consequenciaId: number,
  data: BarreiraInput,
) =>
  apiFetch<Barreira>(`/riscos/consequencias/${consequenciaId}/barreiras`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const atualizarBarreiraCorretiva = (id: number, data: BarreiraInput) =>
  apiFetch<Barreira>(`/riscos/barreiras-corretivas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const excluirBarreiraCorretiva = (id: number) =>
  apiFetch<void>(`/riscos/barreiras-corretivas/${id}`, { method: "DELETE" });

export const adicionarFator = (bowtieId: number, data: FatorInput) =>
  apiFetch<Fator>(`/riscos/bowties/${bowtieId}/fatores`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const excluirFator = (id: number) =>
  apiFetch<void>(`/riscos/fatores/${id}`, { method: "DELETE" });

// ============================================================================
// Ações e Controles
// ============================================================================

export interface Acao {
  id: number;
  risco_id: number;
  bowtie_id?: number | null;
  codigo?: string | null;
  descricao: string;
  tipo: "preventiva" | "corretiva";
  responsavel_id?: number | null;
  responsavel_nome?: string | null;
  dono_risco_id?: number | null;
  dono_risco_nome?: string | null;
  area?: string | null;
  categoria?: string | null;
  subrisco?: string | null;
  grupo_trabalho?: string | null;
  tema_relacionado?: string | null;
  prazo?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  inicio_texto?: string | null;
  conclusao_texto?: string | null;
  status: string;
  percentual: number;
  detalhamento?: string | null;
  valor_estimado?: number | null;
  evidencias?: string | null;
  comentario?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcaoInput {
  risco_id: number;
  bowtie_id?: number | null;
  descricao: string;
  tipo: "preventiva" | "corretiva";
  responsavel_id?: number | null;
  prazo?: string | null;
  status?: string;
  percentual?: number;
  comentario?: string | null;
}

export interface AcaoPatch {
  descricao?: string;
  tipo?: "preventiva" | "corretiva";
  responsavel_id?: number | null;
  prazo?: string | null;
  status?: string;
  percentual?: number;
  comentario?: string | null;
}

export interface AcoesFilters {
  risco_id?: number;
  responsavel_id?: number;
  status?: string;
  tipo?: string;
  atrasadas?: boolean;
}

export interface AcoesResumo {
  total: number;
  atrasadas: number;
  por_status: Record<string, number>;
  por_tipo: Record<string, number>;
  por_responsavel: Record<string, number>;
}

export const STATUS_ACAO = [
  { value: "nao_iniciada", label: "Não iniciada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "atrasada", label: "Atrasada" },
  { value: "cancelada", label: "Cancelada" },
];

export const STATUS_ACAO_COLOR: Record<string, string> = {
  nao_iniciada: "#64748b",
  em_andamento: "#3b82f6",
  concluida: "#16a34a",
  atrasada: "#dc2626",
  cancelada: "#9ca3af",
};

export const fetchAcoes = (filters: AcoesFilters = {}) => {
  const q: Record<string, string | number | undefined> = { ...filters };
  if (filters.atrasadas) q.atrasadas = "true";
  return apiFetch<Acao[]>(`/riscos/acoes${qs(q)}`);
};

export const fetchAcoesResumo = () => apiFetch<AcoesResumo>("/riscos/acoes/resumo");

export const criarAcao = (data: AcaoInput) =>
  apiFetch<Acao>("/riscos/acoes", { method: "POST", body: JSON.stringify(data) });

export const atualizarAcao = (id: number, data: AcaoPatch) =>
  apiFetch<Acao>(`/riscos/acoes/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const excluirAcao = (id: number) =>
  apiFetch<void>(`/riscos/acoes/${id}`, { method: "DELETE" });

export interface Controle {
  id: number;
  risco_id: number;
  bowtie_id?: number | null;
  descricao: string;
  tipo: "preventivo" | "corretivo";
  responsavel_id?: number | null;
  responsavel_nome?: string | null;
  periodicidade_teste?: string | null;
  ultimo_teste?: string | null;
  status_teste?: string | null;
  efetividade?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ControleInput {
  risco_id: number;
  bowtie_id?: number | null;
  descricao: string;
  tipo: "preventivo" | "corretivo";
  responsavel_id?: number | null;
  periodicidade_teste?: string | null;
  ultimo_teste?: string | null;
  status_teste?: string | null;
  efetividade?: number | null;
}

export interface ControlePatch {
  descricao?: string;
  tipo?: "preventivo" | "corretivo";
  responsavel_id?: number | null;
  periodicidade_teste?: string | null;
  ultimo_teste?: string | null;
  status_teste?: string | null;
  efetividade?: number | null;
}

export interface TesteInput {
  data_teste: string;
  status_teste: "aprovado" | "reprovado" | "parcial";
  observacao?: string;
}

export const fetchControles = (filters: {
  risco_id?: number;
  tipo?: string;
  responsavel_id?: number;
} = {}) => apiFetch<Controle[]>(`/riscos/controles${qs(filters as Record<string, string | number | undefined>)}`);

export const criarControle = (data: ControleInput) =>
  apiFetch<Controle>("/riscos/controles", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const atualizarControle = (id: number, data: ControlePatch) =>
  apiFetch<Controle>(`/riscos/controles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const excluirControle = (id: number) =>
  apiFetch<void>(`/riscos/controles/${id}`, { method: "DELETE" });

export const registrarTesteControle = (id: number, data: TesteInput) =>
  apiFetch<Controle>(`/riscos/controles/${id}/teste`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// ============================================================================
// Alertas de criticidade e dashboards
// ============================================================================

export interface AlertaItem {
  id: number;
  codigo: string;
  descricao: string;
}

export interface AlertaRisco {
  risco_id: number;
  codigo: string;
  nome: string;
  classificacao_residual?: Classificacao | null;
  causas_criticas_sem_tratamento: AlertaItem[];
  consequencias_criticas_sem_tratamento: AlertaItem[];
}

export interface AlertasGlobal {
  total_causas_criticas: number;
  total_consequencias_criticas: number;
  total_causas_criticas_sem_tratamento: number;
  total_consequencias_criticas_sem_tratamento: number;
  riscos_com_alerta: AlertaRisco[];
}

export interface AlertasRisco {
  causas_criticas_sem_tratamento: AlertaItem[];
  consequencias_criticas_sem_tratamento: AlertaItem[];
}

export const fetchAlertasGlobal = () =>
  apiFetch<AlertasGlobal>("/riscos/alertas-criticidade");

export const fetchAlertasRisco = (riscoId: number) =>
  apiFetch<AlertasRisco>(`/riscos/riscos/${riscoId}/alertas-criticidade`);

export interface AcoesDashboard {
  total: number;
  atrasadas: number;
  vencendo_30d: number;
  concluidas_pct_medio: number;
  sem_responsavel: number;
  sem_prazo: number;
  por_status: Record<string, number>;
  por_tipo: Record<string, number>;
  por_responsavel_top: [string, number][];
  por_dono_risco_top: [string, number][];
  por_area_top: [string, number][];
  por_categoria_top: [string, number][];
  por_grupo_trabalho_top: [string, number][];
  por_risco_top: [string, number][];
  status_por_responsavel: Record<string, Record<string, number>>;
}

export interface GanttAcao {
  id: number;
  codigo?: string | null;
  descricao: string;
  tipo: "preventiva" | "corretiva";
  status: string;
  percentual: number;
  data_inicio: string;
  data_fim: string;
  responsavel_nome?: string | null;
  dono_risco_nome?: string | null;
  risco_id: number;
  risco_codigo?: string | null;
  risco_nome?: string | null;
  area?: string | null;
  grupo_trabalho?: string | null;
}

export const fetchGanttAcoes = (filters: { risco_id?: number; responsavel_id?: number } = {}) =>
  apiFetch<GanttAcao[]>(`/riscos/acoes/gantt${qs(filters as Record<string, string | number | undefined>)}`);

export const importarAtualizacao = () =>
  apiFetch<{ arquivo: string; controles: number; acoes: number; pessoas_criadas: number }>(
    "/riscos/importar-atualizacao",
    { method: "POST" },
  );

export const fetchAcoesDashboard = () =>
  apiFetch<AcoesDashboard>("/riscos/acoes/dashboard");

export interface ControlesDashboard {
  total: number;
  por_tipo: Record<string, number>;
  por_status_teste: Record<string, number>;
  por_efetividade: Record<string, number>;
  por_periodicidade: Record<string, number>;
  por_risco_top: [string, number][];
  sem_responsavel: number;
  sem_teste: number;
  testado_ha_mais_6m: number;
}

export const fetchControlesDashboard = () =>
  apiFetch<ControlesDashboard>("/riscos/controles/dashboard");
