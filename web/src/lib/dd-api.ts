/** Cliente do módulo Due Diligence editável (Régua-Mestre + Instâncias). */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const BASE = `${API}/dd`;

/* ── Tipos ── */

export interface DDTemplate {
  id: number;
  objeto_tipo: string;
  licenca_codigo: string;
  nome: string;
  descricao?: string | null;
  versao: number;
  norma_origem?: string | null;
  ativo: boolean;
  criado_por?: string | null;
  criado_em: string;
}

export interface DDCriterio {
  id: number;
  documento_id: number;
  requisito_id?: string | null;
  topico?: string | null;
  teste_aderencia?: string | null;
  evidencia_esperada: string;
  proveniencia: string;
  obrigatoriedade: string;
  peso: number;
  impacto?: number | null;
  norma_origem?: string | null;
  artigo_referencia?: string | null;
  ativo: boolean;
  ordem: number;
}

export interface DDDocumento {
  id: number;
  template_id: number;
  doc_id?: string | null;
  nome: string;
  descricao?: string | null;
  modulo?: string | null;
  norma_referencia?: string | null;
  obrigatorio: boolean;
  ordem: number;
  criterios?: DDCriterio[];
}

export interface DDTemplateArvore {
  template: DDTemplate;
  documentos: DDDocumento[];
}

export interface DDInstancia {
  id: number;
  template_id: number;
  template_versao: number;
  objeto_tipo: string;
  licenca_codigo: string;
  cliente: string;
  escopo?: string | null;
  atividade?: string | null;
  classe?: number | null;
  status: string;
  criado_por?: string | null;
  criado_em: string;
}

export interface DDInstanciaCriterio {
  id: number;
  inst_documento_id: number;
  requisito_id?: string | null;
  topico?: string | null;
  teste_aderencia?: string | null;
  evidencia_esperada: string;
  proveniencia: string;
  obrigatoriedade: string;
  peso: number;
  avaliacao?: string | null;
  observacao?: string | null;
  evidencia_encontrada?: string | null;
  fonte_avaliacao?: string | null;
}

export interface DDInstanciaDocumento {
  id: number;
  instancia_id: number;
  doc_id?: string | null;
  nome: string;
  obrigatorio: boolean;
  status_doc?: string | null;
  arquivo_ref?: string | null;
  criterios?: DDInstanciaCriterio[];
}

export interface DDInstanciaArvore {
  instancia: DDInstancia;
  documentos: DDInstanciaDocumento[];
}

export interface DDScoreDoc {
  doc_id: number;
  nome: string;
  pct: number;
  status: string;
  cor: string;
  obrigatorios_atendidos: number;
  obrigatorios_total: number;
  criterios_total: number;
}

export interface DDScore {
  por_documento: DDScoreDoc[];
  global: {
    conformidade_ponderada: number;
    conformidade_nao_ponderada: number;
    classificacao: string;
    cor: string;
    descricao: string;
    atende: number;
    atende_parcial: number;
    nao_atende: number;
    nao_aplica: number;
  };
}

export interface DDAuditoria {
  id: number;
  entidade: string;
  entidade_id: number;
  acao: string;
  autor?: string | null;
  justificativa?: string | null;
  diff?: unknown;
  criado_em: string;
}

/* ── Helpers HTTP ── */

function qs(params?: Record<string, unknown>): string {
  if (!params) return "";
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

async function jget<T>(p: string): Promise<T> {
  const r = await fetch(`${BASE}${p}`);
  if (!r.ok) throw new Error(`GET ${p} ${r.status}`);
  return r.json();
}
async function jsend<T>(p: string, m: string, b?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${p}`, {
    method: m,
    headers: b ? { "Content-Type": "application/json" } : undefined,
    body: b ? JSON.stringify(b) : undefined,
  });
  if (!r.ok) throw new Error(`${m} ${p} ${r.status}`);
  return r.json();
}

/* ── API ── */

export const ddApi = {
  // Templates (régua-mestre)
  templates: (params?: { objeto_tipo?: string; licenca_codigo?: string }) =>
    jget<DDTemplate[]>(`/templates${qs(params)}`),
  template: (id: number) => jget<DDTemplateArvore>(`/templates/${id}`),
  criarTemplate: (body: Partial<DDTemplate>) =>
    jsend<DDTemplate>("/templates", "POST", body),
  patchTemplate: (id: number, body: Record<string, unknown>) =>
    jsend<DDTemplate>(`/templates/${id}`, "PATCH", body),
  novaVersao: (id: number, body: Record<string, unknown>) =>
    jsend<DDTemplate>(`/templates/${id}/nova-versao`, "POST", body),

  // Documentos e critérios da régua-mestre
  criarDocumento: (body: Record<string, unknown>) =>
    jsend<DDDocumento>("/documentos", "POST", body),
  patchDocumento: (id: number, body: Record<string, unknown>) =>
    jsend<DDDocumento>(`/documentos/${id}`, "PATCH", body),
  criarCriterio: (body: Record<string, unknown>) =>
    jsend<DDCriterio>("/criterios", "POST", body),
  patchCriterio: (id: number, body: Record<string, unknown>) =>
    jsend<DDCriterio>(`/criterios/${id}`, "PATCH", body),
  deleteCriterio: (id: number) =>
    jsend<{ ok: boolean }>(`/criterios/${id}`, "DELETE"),

  // Auditoria
  auditoria: (entidade: string, entidadeId: number) =>
    jget<DDAuditoria[]>(`/auditoria${qs({ entidade, entidade_id: entidadeId })}`),

  // Instâncias
  instancias: (params?: { status?: string; cliente?: string; template_id?: number }) =>
    jget<DDInstancia[]>(`/instancias${qs(params)}`),
  instancia: (id: number) => jget<DDInstanciaArvore>(`/instancias/${id}`),
  criarInstancia: (body: Record<string, unknown>) =>
    jsend<DDInstancia>("/instancias", "POST", body),
  patchInstancia: (id: number, body: Record<string, unknown>) =>
    jsend<DDInstancia>(`/instancias/${id}`, "PATCH", body),
  avaliarCriterio: (instId: number, critId: number, body: Record<string, unknown>) =>
    jsend<DDInstanciaCriterio>(
      `/instancias/${instId}/criterios/${critId}/avaliar`,
      "POST",
      body,
    ),
  avaliarLote: (instId: number, body: { avaliacoes: Record<string, unknown>[] }) =>
    jsend<{ ok: boolean }>(`/instancias/${instId}/criterios`, "PATCH", body),
  addCriterioInstancia: (instId: number, body: Record<string, unknown>) =>
    jsend<DDInstanciaCriterio>(`/instancias/${instId}/criterios`, "POST", body),
  score: (instId: number) => jget<DDScore>(`/instancias/${instId}/score`),
};

/* ── Labels e helpers de UI ── */

export const OBJETO_TIPO_LABEL: Record<string, string> = {
  licenca_ambiental: "Licença Ambiental",
  anuencia: "Anuência",
  regularizacao_fundiaria: "Regularização Fundiária",
};

export const OBJETO_TIPOS = [
  "licenca_ambiental",
  "anuencia",
  "regularizacao_fundiaria",
] as const;

export const OBRIGATORIEDADE_LABEL: Record<string, string> = {
  obrigatorio: "Obrigatório",
  desejavel: "Desejável",
};

export const AVALIACAO_OPTIONS: { value: string; label: string; classe: string }[] = [
  { value: "Atende", label: "Atende", classe: "bg-success hover:bg-success/90" },
  { value: "Atende Parcialmente", label: "Parcial", classe: "bg-warning hover:bg-warning/90" },
  { value: "Não Atende", label: "Não Atende", classe: "bg-danger hover:bg-danger/90" },
  { value: "Não Aplica", label: "N/A", classe: "" },
];

export function fmtData(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDataHora(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
