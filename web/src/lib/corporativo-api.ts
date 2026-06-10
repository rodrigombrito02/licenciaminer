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

export const CATEGORIA_ERM_COR: Record<string, string> = {
  EST: "#dc2626",
  OPE: "#f59e0b",
  FIN: "#eab308",
  REP: "#8b5cf6",
  CON: "#0ea5e9",
};

export const PERSPECTIVA_BSC_LABEL: Record<string, string> = {
  financeira: "Financeira",
  cliente: "Cliente",
  processos_internos: "Processos internos",
  aprendizado: "Aprendizado & Pessoas",
  esg: "ESG",
};

export const PERSPECTIVA_BSC_COR: Record<string, string> = {
  financeira: "#16a34a",
  cliente: "#0ea5e9",
  processos_internos: "#8b5cf6",
  aprendizado: "#f59e0b",
  esg: "#0891b2",
};

export interface Projeto {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  status: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  owner_id?: number | null;
  owner_nome?: string | null;
  orcamento?: number | null;
  escopo?: string | null;
  ativo: boolean;
  n_riscos: number;
}

export interface CategoriaERM {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  cor?: string | null;
  ordem: number;
}

export interface LinhaDefesa {
  id: number;
  numero: number;
  nome: string;
  descricao?: string | null;
  responsabilidades?: string | null;
  responsavel_id?: number | null;
  responsavel_nome?: string | null;
  n_riscos: number;
}

export interface Objetivo {
  id: number;
  codigo: string;
  descricao: string;
  perspectiva_bsc: string;
  horizonte: string;
  meta?: string | null;
  indicador?: string | null;
  valor_meta?: number | null;
  unidade_meta?: string | null;
  responsavel_id?: number | null;
  responsavel_nome?: string | null;
  ativo: boolean;
  n_riscos_ameacando?: number;
}

export interface ObjetivoDetalhe extends Objetivo {
  riscos_vinculados: {
    id: number;
    codigo: string;
    nome: string;
    tipo_escopo: string;
    natureza: string;
    classificacao_residual?: string | null;
    impacto_percebido?: number | null;
  }[];
}

export interface SnapshotItem {
  posicao: number;
  risco_id: number;
  risco_codigo?: string | null;
  risco_nome?: string | null;
  classificacao_residual?: string | null;
  prob_residual?: number | null;
  impacto_residual?: number | null;
  score?: number | null;
  acoes_abertas: number;
  acoes_atrasadas: number;
}

export interface SnapshotResumo {
  id: number;
  data_snapshot: string;
  titulo: string;
  periodo?: string | null;
  tipo_escopo: string;
  gerado_por?: string | null;
  observacoes?: string | null;
  n_itens: number;
}

export interface SnapshotDetalhe extends SnapshotResumo {
  itens: SnapshotItem[];
}

export interface AlertaSnapshot {
  alerta: boolean;
  motivo: "nenhum_snapshot" | "vencido" | "dentro_do_prazo";
  dias_desde_ultimo?: number | null;
  data_ultimo?: string | null;
  ultimo_snapshot_id?: number;
  ultimo_snapshot_titulo?: string;
  periodicidade_dias: number;
  data_sugerida_proximo: string;
  dias_restantes?: number;
}

export interface DashboardCorporativo {
  total_corporativos: number;
  total_ameacas: number;
  total_oportunidades: number;
  por_classificacao_residual: Record<string, number>;
  criticos: number;
  muito_significativos: number;
  por_categoria_erm: Record<string, { nome: string; cor: string | null; n: number; criticos: number }>;
  por_linha_defesa: Record<string, number>;
  por_horizonte: Record<string, number>;
  por_tratamento_estrategico: Record<string, number>;
  top_10: {
    id: number;
    codigo: string;
    nome: string;
    categoria_erm_id?: number | null;
    classificacao_residual?: string | null;
    prob_residual?: number | null;
    impacto_residual?: number | null;
    score: number;
  }[];
  cobertura_objetivos: {
    id: number;
    codigo: string;
    descricao: string;
    perspectiva_bsc: string;
    n_riscos: number;
  }[];
}

export const fetchDashboardCorporativo = () =>
  apiFetch<DashboardCorporativo>("/corporativo/dashboard");

export const fetchProjetos = () =>
  apiFetch<Projeto[]>("/corporativo/projetos");

export interface ProjetoInput {
  codigo: string;
  nome: string;
  descricao?: string;
  status?: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  owner_id?: number | null;
  orcamento?: number | null;
  escopo?: string;
  ativo?: boolean;
}

export const criarProjeto = (data: ProjetoInput) =>
  apiFetch<Projeto>("/corporativo/projetos", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const atualizarProjeto = (id: number, data: ProjetoInput) =>
  apiFetch<Projeto>(`/corporativo/projetos/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const excluirProjeto = (id: number) =>
  apiFetch<void>(`/corporativo/projetos/${id}`, { method: "DELETE" });

export const fetchCategoriasERM = () =>
  apiFetch<CategoriaERM[]>("/corporativo/categorias-erm");

export const fetchLinhasDefesa = () =>
  apiFetch<LinhaDefesa[]>("/corporativo/linhas-defesa");

export const fetchObjetivos = () =>
  apiFetch<Objetivo[]>("/corporativo/objetivos");

export const fetchObjetivoDetalhe = (id: number) =>
  apiFetch<ObjetivoDetalhe>(`/corporativo/objetivos/${id}`);

export const fetchSnapshots = (tipo_escopo = "corporativo") =>
  apiFetch<SnapshotResumo[]>(`/corporativo/snapshots?tipo_escopo=${tipo_escopo}`);

export const fetchSnapshotDetalhe = (id: number) =>
  apiFetch<SnapshotDetalhe>(`/corporativo/snapshots/${id}`);

export const fetchAlertaSnapshot = (tipo_escopo = "corporativo") =>
  apiFetch<AlertaSnapshot>(`/corporativo/snapshots/alerta/status?tipo_escopo=${tipo_escopo}`);

export interface SnapshotInput {
  titulo: string;
  periodo?: string;
  tipo_escopo?: string;
  observacoes?: string;
  gerado_por?: string;
  top_n?: number;
}

export const criarSnapshot = (data: SnapshotInput) =>
  apiFetch<SnapshotDetalhe>("/corporativo/snapshots", {
    method: "POST",
    body: JSON.stringify(data),
  });
