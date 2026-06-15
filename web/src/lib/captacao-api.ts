/**
 * Cliente do módulo Captação — inbox de demandas, interações e conversão.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const BASE = `${API_BASE}/captacao`;

export interface CapInteracao {
  id: number;
  autor: string | null;
  texto: string | null;
  tipo: string | null;
  criado_em: string;
}

export interface CapDemanda {
  id: number;
  titulo: string;
  descricao: string | null;
  origem: string | null;
  frente: string | null;
  status: string;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  empresa: string | null;
  cnpj: string | null;
  oportunidade_id: number | null;
  processo_anm: string | null;
  responsavel: string | null;
  valor_estimado: number | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
  n_interacoes: number;
  interacoes: CapInteracao[];
}

export interface CapMeta {
  origens: string[];
  origem_labels: Record<string, string>;
  frentes: string[];
  frente_labels: Record<string, string>;
  status: string[];
  status_labels: Record<string, string>;
}

export interface CapKpis {
  total: number;
  por_status: Record<string, number>;
  por_origem: Record<string, number>;
  por_frente: Record<string, number>;
  ganhos: number;
  taxa_conversao: number | null;
}

async function jget<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function jsend<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

export const capApi = {
  meta: () => jget<CapMeta>("/meta"),
  kpis: () => jget<CapKpis>("/kpis"),
  listar: (params: { status?: string; frente?: string; origem?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.frente) qs.set("frente", params.frente);
    if (params.origem) qs.set("origem", params.origem);
    const q = qs.toString();
    return jget<CapDemanda[]>(`/demandas${q ? `?${q}` : ""}`);
  },
  obter: (id: number) => jget<CapDemanda>(`/demandas/${id}`),
  criar: (d: Partial<CapDemanda>) => jsend<CapDemanda>("/demandas", "POST", d),
  atualizar: (id: number, patch: Partial<CapDemanda>) => jsend<CapDemanda>(`/demandas/${id}`, "PATCH", patch),
  deletar: (id: number) => jsend<{ ok: boolean }>(`/demandas/${id}`, "DELETE"),
  interagir: (id: number, i: { autor?: string; texto: string; tipo?: string }) =>
    jsend<CapDemanda>(`/demandas/${id}/interacoes`, "POST", i),
  promover: (id: number) => jsend<CapDemanda>(`/demandas/${id}/promover`, "POST"),
};
