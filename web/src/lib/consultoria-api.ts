/**
 * Cliente do módulo SQ Consultoria — carteira de clientes + escopos.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const BASE = `${API_BASE}/consultoria`;

export interface ConsVinculo {
  modulo: string;
  label: string;
  href: string;
}

export interface ConsEscopo {
  id: number;
  cliente_id: number;
  titulo: string;
  tipo: string;
  descricao: string | null;
  status: string;
  responsavel: string | null;
  valor: number | null;
  vinculos: ConsVinculo[] | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ConsCliente {
  id: number;
  nome: string;
  cnpj: string | null;
  setor: string | null;
  status: string;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  responsavel: string | null;
  notas: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
  n_escopos: number;
  escopos: ConsEscopo[];
}

export interface ConsMeta {
  status_cliente: string[];
  status_cliente_labels: Record<string, string>;
  tipos_escopo: string[];
  tipo_labels: Record<string, string>;
  status_escopo: string[];
  status_escopo_labels: Record<string, string>;
  modulos_vinculaveis: Record<string, { label: string; href: string }>;
}

export interface ConsKpis {
  total_clientes: number;
  clientes_ativos: number;
  total_escopos: number;
  escopos_em_andamento: number;
  por_tipo: Record<string, number>;
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

export const consApi = {
  meta: () => jget<ConsMeta>("/meta"),
  kpis: () => jget<ConsKpis>("/kpis"),
  listar: (status?: string) => jget<ConsCliente[]>(`/clientes${status ? `?status=${status}` : ""}`),
  obter: (id: number) => jget<ConsCliente>(`/clientes/${id}`),
  criar: (c: Partial<ConsCliente>) => jsend<ConsCliente>("/clientes", "POST", c),
  atualizar: (id: number, patch: Partial<ConsCliente>) => jsend<ConsCliente>(`/clientes/${id}`, "PATCH", patch),
  deletar: (id: number) => jsend<{ ok: boolean }>(`/clientes/${id}`, "DELETE"),
  criarEscopo: (clienteId: number, e: Partial<ConsEscopo>) =>
    jsend<ConsCliente>(`/clientes/${clienteId}/escopos`, "POST", e),
  atualizarEscopo: (escopoId: number, patch: Partial<ConsEscopo>) =>
    jsend<ConsEscopo>(`/escopos/${escopoId}`, "PATCH", patch),
  deletarEscopo: (escopoId: number) => jsend<{ ok: boolean }>(`/escopos/${escopoId}`, "DELETE"),
};
