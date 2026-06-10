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

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

export interface MembroComite {
  id: number;
  pessoa_id: number;
  pessoa_nome?: string | null;
  papel: string;
  contato_24_7?: string | null;
  ordem: number;
}

export interface Comite {
  id: number;
  nome: string;
  descricao?: string | null;
  nivel?: string | null;
  ativo: boolean;
  membros: MembroComite[];
}

export interface CenarioResumo {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  severidade?: number | null;
  probabilidade?: number | null;
  risco_id?: number | null;
  risco_codigo?: string | null;
  risco_nome?: string | null;
  comite_id?: number | null;
  comite_nome?: string | null;
  coordenador_id?: number | null;
  coordenador_nome?: string | null;
  status: string;
  ultima_revisao?: string | null;
  n_acionamentos: number;
  n_runbooks: number;
  n_simulados: number;
  n_licoes: number;
}

export interface AcionamentoStep {
  id: number;
  ordem: number;
  papel: string;
  pessoa_id?: number | null;
  pessoa_nome?: string | null;
  criterio?: string | null;
  tempo_resposta_min?: number | null;
  contato?: string | null;
}

export interface RunbookStep {
  id: number;
  ordem: number;
  descricao: string;
  tempo_estimado_min?: number | null;
  recursos_necessarios?: string | null;
  responsavel_nome?: string | null;
}

export interface Runbook {
  id: number;
  titulo: string;
  versao: number;
  descricao?: string | null;
  data_revisao?: string | null;
  aprovador_nome?: string | null;
  steps: RunbookStep[];
}

export interface Simulado {
  id: number;
  titulo: string;
  tipo: string;
  data_prevista?: string | null;
  data_realizacao?: string | null;
  status: string;
  facilitador_nome?: string | null;
  objetivos?: string | null;
  resultado?: string | null;
  gaps_identificados?: string | null;
  nota_performance?: number | null;
  cenario_id?: number;
  cenario_codigo?: string | null;
  cenario_nome?: string | null;
}

export interface Licao {
  id: number;
  data?: string | null;
  descricao: string;
  melhoria_proposta?: string | null;
  responsavel_nome?: string | null;
  status: string;
}

export interface CenarioDetalhe extends CenarioResumo {
  acionamentos: AcionamentoStep[];
  runbooks: Runbook[];
  simulados: Simulado[];
  licoes: Licao[];
}

export interface ProcessoCritico {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  area?: string | null;
  responsavel_id?: number | null;
  responsavel_nome?: string | null;
  elo_cadeia_valor_id?: number | null;
  prioridade: number;
  rto_horas?: number | null;
  rpo_horas?: number | null;
  mtd_horas?: number | null;
  impacto_financeiro_hora?: number | null;
  dependencias?: string | null;
  recursos_minimos?: string | null;
  n_planos: number;
}

export interface PlanoRecuperacaoStep {
  id: number;
  ordem: number;
  descricao: string;
  responsavel_nome?: string | null;
  tempo_estimado_min?: number | null;
  recursos?: string | null;
}

export interface TestePlano {
  id: number;
  data?: string | null;
  tipo: string;
  status: string;
  gaps_identificados?: string | null;
  aprovador_nome?: string | null;
  observacoes?: string | null;
}

export interface PlanoRecuperacao {
  id: number;
  titulo: string;
  versao: number;
  descricao?: string | null;
  data_revisao?: string | null;
  aprovador_nome?: string | null;
  steps: PlanoRecuperacaoStep[];
  testes: TestePlano[];
}

export interface ProcessoDetalhe extends ProcessoCritico {
  planos: PlanoRecuperacao[];
}

export interface CrisesDashboard {
  total_cenarios: number;
  cenarios_aprovados: number;
  cenarios_em_revisao: number;
  total_simulados: number;
  simulados_realizados: number;
  simulados_planejados: number;
  nota_media_simulados: number | null;
  total_processos_criticos: number;
  processos_alta_prioridade: number;
  exposicao_financeira_hora: number;
  por_categoria: Record<string, number>;
  por_severidade: Record<string, number>;
  por_status: Record<string, number>;
  cenarios_criticos_top: {
    id: number;
    codigo: string;
    nome: string;
    categoria?: string | null;
    severidade?: number | null;
    probabilidade?: number | null;
    score: number;
  }[];
  proximos_simulados: {
    id: number;
    titulo: string;
    data_prevista?: string | null;
    tipo: string;
    cenario_id: number;
  }[];
}

export const fetchCrisesDashboard = () =>
  apiFetch<CrisesDashboard>("/crises/dashboard");

export const fetchCenarios = (filters: { categoria?: string; severidade_min?: number } = {}) =>
  apiFetch<CenarioResumo[]>(`/crises/cenarios${qs(filters as Record<string, string | number | undefined>)}`);

export const fetchCenario = (id: number) =>
  apiFetch<CenarioDetalhe>(`/crises/cenarios/${id}`);

export const fetchComites = () => apiFetch<Comite[]>("/crises/comites");

export const fetchSimulados = (status?: string) =>
  apiFetch<Simulado[]>(`/crises/simulados${status ? `?status=${status}` : ""}`);

export const fetchProcessosCriticos = () =>
  apiFetch<ProcessoCritico[]>("/crises/processos-criticos");

export const fetchProcessoCritico = (id: number) =>
  apiFetch<ProcessoDetalhe>(`/crises/processos-criticos/${id}`);

export const CATEGORIA_COR: Record<string, string> = {
  seguranca: "#dc2626",
  ambiental: "#16a34a",
  reputacional: "#a855f7",
  financeiro: "#eab308",
  cyber: "#3b82f6",
  regulatorio: "#f59e0b",
  operacional: "#64748b",
};

export const STATUS_CENARIO_COLOR: Record<string, string> = {
  aprovado: "#16a34a",
  em_revisao: "#f59e0b",
  mapeado: "#64748b",
  obsoleto: "#9ca3af",
};
