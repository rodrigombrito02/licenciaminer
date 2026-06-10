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

export type StatusKRI = "verde" | "amarelo" | "vermelho" | "sem_dados";

export const STATUS_KRI_COLOR: Record<string, string> = {
  verde: "#16a34a",
  amarelo: "#eab308",
  vermelho: "#dc2626",
  sem_dados: "#64748b",
};

export interface KRIMedicao {
  id: number;
  data: string;
  valor: number;
  status: string | null;
  observacao?: string | null;
}

export interface KRI {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  risco_id?: number | null;
  risco_codigo?: string | null;
  categoria_id?: number | null;
  categoria_nome?: string | null;
  responsavel_id?: number | null;
  responsavel_nome?: string | null;
  unidade: string;
  formula_descricao?: string | null;
  direcao: "subir_pior" | "descer_pior";
  limite_verde?: number | null;
  limite_amarelo?: number | null;
  limite_vermelho?: number | null;
  periodicidade: string;
  fonte_dados?: string | null;
  ativo: boolean;
  n_medicoes: number;
  ultimo_valor?: number | null;
  ultimo_status?: StatusKRI | null;
  ultima_data?: string | null;
  valor_anterior?: number | null;
  tendencia?: "subindo" | "descendo" | "estavel" | null;
}

export interface KRIDetalhe extends KRI {
  medicoes: KRIMedicao[];
}

export interface KRIsDashboard {
  total: number;
  status_count: Record<string, number>;
  por_categoria: Record<string, Record<string, number>>;
  vermelhos: KRI[];
  amarelos: KRI[];
}

export const fetchKRIs = (status?: string) =>
  apiFetch<KRI[]>(`/monitoramento/kris${status ? `?status=${status}` : ""}`);

export const fetchKRIDashboard = () =>
  apiFetch<KRIsDashboard>("/monitoramento/kris/dashboard");

export const fetchKRI = (id: number) =>
  apiFetch<KRIDetalhe>(`/monitoramento/kris/${id}`);

export const addMedicao = (kriId: number, data: { data: string; valor: number; observacao?: string }) =>
  apiFetch(`/monitoramento/kris/${kriId}/medicoes`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface TesteControle {
  id: number;
  controle_id: number;
  data_teste: string;
  status: "aprovado" | "parcial" | "reprovado";
  metodologia?: string | null;
  evidencia?: string | null;
  gaps_identificados?: string | null;
  plano_acao_remediacao?: string | null;
  executor_nome?: string | null;
  aprovador_nome?: string | null;
  created_at: string;
}

export const fetchTestesControle = (controleId: number) =>
  apiFetch<TesteControle[]>(`/monitoramento/controles/${controleId}/testes`);

export interface TesteInput {
  data_teste: string;
  status: "aprovado" | "parcial" | "reprovado";
  metodologia?: string;
  evidencia?: string;
  gaps_identificados?: string;
  plano_acao_remediacao?: string;
}

export const createTesteControle = (controleId: number, data: TesteInput) =>
  apiFetch<TesteControle>(`/monitoramento/controles/${controleId}/testes`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface AgendaTeste {
  controle_id: number;
  descricao: string;
  tipo: string;
  periodicidade: string;
  ultimo_teste?: string | null;
  ultimo_status?: string | null;
  proxima_data: string;
  dias_para_proximo: number;
  vencido: boolean;
  responsavel_nome?: string | null;
  risco_id?: number | null;
  risco_codigo?: string | null;
}

export const fetchAgendaTestes = () =>
  apiFetch<AgendaTeste[]>("/monitoramento/testes/agenda");

export interface Appetite {
  id: number;
  categoria_id?: number | null;
  categoria_nome?: string | null;
  categoria_cor?: string | null;
  escopo: string;
  apetite_nivel: number;
  tolerancia_max_classificacao: "PS" | "S" | "MS" | "C";
  descricao?: string | null;
  trigger_escalation?: string | null;
  data_aprovacao?: string | null;
  aprovador_nome?: string | null;
  ativo: boolean;
}

export interface AppetiteBreach {
  categoria_id: number;
  categoria_nome: string;
  categoria_cor?: string | null;
  apetite_nivel: number;
  tolerancia: "PS" | "S" | "MS" | "C";
  descricao?: string | null;
  trigger_escalation?: string | null;
  total_riscos: number;
  em_breach: number;
  ok: number;
  por_classificacao: Record<string, number>;
  riscos_em_breach: {
    id: number;
    codigo: string;
    nome: string;
    classificacao_residual?: string | null;
  }[];
}

export interface AppetiteDashboard {
  total_apetites: number;
  categorias_cobertas: number;
  riscos_em_breach_total: number;
  apetites: AppetiteBreach[];
}

export const fetchAppetiteList = () =>
  apiFetch<Appetite[]>("/monitoramento/appetite");

export const fetchAppetiteDashboard = () =>
  apiFetch<AppetiteDashboard>("/monitoramento/appetite/dashboard");
