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

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

export interface Stakeholder {
  id: number;
  nome: string;
  tipo: string;
  organizacao?: string | null;
  cargo?: string | null;
  descricao?: string | null;
  contato_email?: string | null;
  contato_telefone?: string | null;
  contato_outros?: string | null;
  criticidade: number;
  ativo: boolean;
}

export interface Canal {
  id: number;
  nome: string;
  tipo: string;
  formal: boolean;
  latencia_min?: number | null;
  descricao?: string | null;
}

export interface TemplateComunicacao {
  id: number;
  codigo: string;
  titulo: string;
  categoria?: string | null;
  corpo: string;
  canal_sugerido?: string | null;
  publicos_sugeridos?: string | null;
  risco_id?: number | null;
  cenario_id?: number | null;
  aprovacao_juridica: boolean;
}

export interface RACI {
  id: number;
  entidade_tipo: string;
  entidade_id: number;
  stakeholder_id: number;
  stakeholder_nome?: string | null;
  stakeholder_tipo?: string | null;
  papel: "responsavel" | "aprovador" | "consultado" | "informado";
  momento: string;
  canal_preferido?: string | null;
  prazo_max_min?: number | null;
  observacao?: string | null;
  obrigatorio: boolean;
}

export interface Envio {
  id: number;
  data_envio: string;
  template_id?: number | null;
  template_codigo?: string | null;
  template_titulo?: string | null;
  stakeholder_id?: number | null;
  stakeholder_nome?: string | null;
  canal: string;
  assunto?: string | null;
  conteudo?: string | null;
  entidade_tipo?: string | null;
  entidade_id?: number | null;
  enviado_por?: string | null;
  resultado: string;
  observacao?: string | null;
  created_at: string;
}

export interface ComunicacoesDashboard {
  total_stakeholders: number;
  total_templates: number;
  total_envios: number;
  entidades_com_raci: number;
  por_tipo_stakeholder: Record<string, number>;
  por_categoria_template: Record<string, number>;
  por_canal_envio: Record<string, number>;
  ultimos_envios: {
    id: number;
    data_envio: string;
    template_codigo?: string | null;
    stakeholder_nome?: string | null;
    canal: string;
    resultado: string;
    assunto?: string | null;
  }[];
}

export const TIPO_COR: Record<string, string> = {
  governamental: "#dc2626",
  comunidade: "#f97316",
  imprensa: "#a855f7",
  interno: "#0ea5e9",
  cliente: "#16a34a",
  fornecedor: "#eab308",
  financeiro: "#8b5cf6",
  externo: "#64748b",
};

export const PAPEL_COR: Record<string, string> = {
  responsavel: "#dc2626",
  aprovador: "#f59e0b",
  consultado: "#0ea5e9",
  informado: "#16a34a",
};

export const PAPEL_LABEL: Record<string, string> = {
  responsavel: "R — Responsável",
  aprovador: "A — Aprovador",
  consultado: "C — Consultado",
  informado: "I — Informado",
};

export const fetchComunicacoesDashboard = () =>
  apiFetch<ComunicacoesDashboard>("/comunicacoes/dashboard");

export const fetchStakeholders = (tipo?: string) =>
  apiFetch<Stakeholder[]>(`/comunicacoes/stakeholders${tipo ? `?tipo=${tipo}` : ""}`);

export const fetchCanais = () => apiFetch<Canal[]>("/comunicacoes/canais");

export const fetchTemplates = (
  filters: { categoria?: string; cenario_id?: number; risco_id?: number } = {},
) =>
  apiFetch<TemplateComunicacao[]>(
    `/comunicacoes/templates${qs(filters as Record<string, string | number | undefined>)}`,
  );

export const fetchTemplate = (id: number) =>
  apiFetch<TemplateComunicacao>(`/comunicacoes/templates/${id}`);

export const fetchRACI = (entidade_tipo?: string, entidade_id?: number) =>
  apiFetch<RACI[]>(
    `/comunicacoes/raci${qs({ entidade_tipo, entidade_id } as Record<string, string | number | undefined>)}`,
  );

export const fetchEnvios = (filters: {
  entidade_tipo?: string;
  entidade_id?: number;
  limit?: number;
} = {}) =>
  apiFetch<Envio[]>(`/comunicacoes/envios${qs(filters as Record<string, string | number | undefined>)}`);

export interface EnvioInput {
  data_envio: string;
  template_id?: number | null;
  stakeholder_id?: number | null;
  canal: string;
  assunto?: string;
  conteudo?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  enviado_por?: string;
  resultado?: string;
  observacao?: string;
}

export const registrarEnvio = (data: EnvioInput) =>
  apiFetch<Envio>("/comunicacoes/envios", {
    method: "POST",
    body: JSON.stringify(data),
  });
