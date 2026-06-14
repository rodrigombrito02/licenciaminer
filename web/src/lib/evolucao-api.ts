/**
 * Cliente do módulo Evolução do Sistema.
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api")
  .replace(/\/api$/, "") + "/api/evolucao";

export type EvTipo = "funcionalidade" | "sprint" | "sugestao" | "produto";

export interface EvComentario {
  id: number;
  autor: string | null;
  texto: string | null;
  voto: string | null;
  criado_em: string | null;
}

export interface EvAnexo {
  id: number;
  nome_arquivo: string;
  tamanho: number | null;
  enviado_por: string | null;
  criado_em: string | null;
}

export interface EvItem {
  id: number;
  tipo: EvTipo;
  titulo: string;
  descricao: string | null;
  modulo: string | null;
  status: string;
  prioridade: string | null;
  visibilidade: string[];
  telas: string[];
  origem: string | null;
  origem_detalhe: string | null;
  evidencia: string | null;
  autor: string | null;
  fase: string | null;
  n_comentarios: number;
  n_anexos?: number;
  votos_aprovar: number;
  votos_reprovar: number;
  criado_em: string | null;
  atualizado_em: string | null;
  comentarios?: EvComentario[];
  anexos?: EvAnexo[];
}

export interface EvMeta {
  modulos: string[];
  niveis_visibilidade: string[];
  origens: string[];
  status: Record<EvTipo, string[]>;
}

export interface EvResumo {
  total: number;
  por_tipo: Record<string, number>;
  por_status: Record<string, number>;
  por_modulo: Record<string, number>;
}

const j = (r: Response) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export const evApi = {
  meta: () => fetch(`${BASE}/meta`).then(j) as Promise<EvMeta>,
  resumo: () => fetch(`${BASE}/resumo`).then(j) as Promise<EvResumo>,
  listar: (filtros?: { tipo?: EvTipo; modulo?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (filtros?.tipo) qs.set("tipo", filtros.tipo);
    if (filtros?.modulo) qs.set("modulo", filtros.modulo);
    if (filtros?.status) qs.set("status", filtros.status);
    const url = qs.toString() ? `${BASE}/itens?${qs}` : `${BASE}/itens`;
    return fetch(url).then(j) as Promise<EvItem[]>;
  },
  obter: (id: number) => fetch(`${BASE}/itens/${id}`).then(j) as Promise<EvItem>,
  criar: (data: Partial<EvItem>) =>
    fetch(`${BASE}/itens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(j) as Promise<EvItem>,
  atualizar: (id: number, data: Partial<EvItem>) =>
    fetch(`${BASE}/itens/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(j) as Promise<EvItem>,
  deletar: (id: number) => fetch(`${BASE}/itens/${id}`, { method: "DELETE" }),
  comentar: (id: number, data: { autor?: string; texto?: string; voto?: string }) =>
    fetch(`${BASE}/itens/${id}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(j) as Promise<EvItem>,
  uploadAnexo: (id: number, file: File, enviadoPor?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (enviadoPor) fd.append("enviado_por", enviadoPor);
    return fetch(`${BASE}/itens/${id}/anexos`, { method: "POST", body: fd }).then(j) as Promise<EvItem>;
  },
  anexoUrl: (anexoId: number) => `${BASE}/anexos/${anexoId}`,
  deletarAnexo: (anexoId: number) => fetch(`${BASE}/anexos/${anexoId}`, { method: "DELETE" }),
};

// ── Labels para UI ──
export const STATUS_LABEL: Record<string, string> = {
  // sprint
  proposta: "Proposta",
  aprovada: "Aprovada",
  em_dev: "Em desenvolvimento",
  entregue: "Entregue",
  validada: "Validada",
  recusada: "Recusada",
  // funcionalidade
  no_ar: "No ar",
  em_sprint: "Em sprint",
  em_breve: "Em breve",
  ideia: "Ideia",
  // sugestao
  nova: "Nova",
  em_avaliacao: "Em avaliação",
  // produto
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

export const NIVEL_LABEL: Record<string, string> = {
  anonimo: "Sem login",
  visitante_free: "Logado",
  visitante_pago: "Premium",
  consultor: "Consultor",
  admin: "Admin",
};

export const ORIGEM_LABEL: Record<string, string> = {
  reuniao: "Reunião",
  claude_local: "Claude (local)",
  cliente: "Cliente",
  interno: "Interno",
};
