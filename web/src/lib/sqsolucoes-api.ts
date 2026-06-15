/** Cliente do módulo SQ Soluções (SST + Customer Success). */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const BASE = `${API}/sqsolucoes`;

export interface CasoUso {
  slug: string; nome: string; dor: string; solucao: string; resultado: string;
  parceiros: string[]; icon: string;
}
export interface Parceiro {
  slug: string; nome: string; modalidade: string; maturidade: string;
  ancora: string; produto: string; demo: boolean;
}
export interface Concorrente {
  nome: string; categoria: string; oferta: string; diferencial_sq: string;
}
export interface SolMeta {
  casos_uso: CasoUso[]; parceiros: Parceiro[]; concorrentes: Concorrente[];
  modalidades: Record<string, string>; fases_pipeline: Record<string, number>;
  fases_projeto: string[]; tipos_dispositivo: string[];
}
export interface Negocio {
  id: number; conta: string; parceiro: string | null; modalidade: string | null;
  caso_uso: string | null; setor: string | null; fase: string; probabilidade: number;
  ticket_min: number | null; ticket_max: number | null; ticket_base: number;
  ponderado: number; mrr: number | null; responsavel: string | null; proximo_passo: string | null;
}
export interface Implantacao {
  id: number; titulo: string; parceiro: string | null; solucao: string | null;
  caso_uso: string | null; modalidade: string | null; fase: string; status: string;
  site: string | null; adocao_pct: number | null; health: string | null; notas: string | null;
}
export interface ClienteServico {
  id: number; nome: string; setor: string | null; unidades: string[] | null;
  responsavel: string | null; implantacoes: Implantacao[]; n_dispositivos: number;
}
export interface Dispositivo {
  id: number; tipo: string; serial: string | null; unidade: string | null;
  status: string; bateria: number | null; ultima_comunicacao: string | null;
}
export interface Frota { total: number; por_status: Record<string, number>; dispositivos: Dispositivo[]; }
export interface SolKpis {
  negocios: number; faturando: number; pipeline_ponderado: number; mrr: number;
  contratos: number; clientes: number; dispositivos: number;
}
export interface Contrato {
  id: number; cliente: string; solucao: string | null; parceiro: string | null;
  modelo: string; mensalidade: number | null; vigencia_meses: number | null;
  inicio: string | null; status: string; responsavel: string | null; notas: string | null;
}
export interface ContratosResp {
  total: number; mrr_total: number; arr_projetado: number;
  modelos: Record<string, string>; contratos: Contrato[];
}

async function jget<T>(p: string): Promise<T> {
  const r = await fetch(`${BASE}${p}`); if (!r.ok) throw new Error(`GET ${p} ${r.status}`); return r.json();
}
async function jsend<T>(p: string, m: string, b?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${p}`, { method: m, headers: b ? { "Content-Type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined });
  if (!r.ok) throw new Error(`${m} ${p} ${r.status}`); return r.json();
}

export interface CSRelatorio {
  implantacao_id: number; cliente: string | null; titulo: string; solucao: string | null;
  site: string | null; fase_projeto: string; adocao_pct: number | null; health: string | null;
  ciclo: string[]; kpis_impacto: { kpi: string; baseline: number | null; atual: number | null }[];
  nota: string;
}

export const solApi = {
  meta: () => jget<SolMeta>("/meta"),
  kpis: () => jget<SolKpis>("/kpis"),
  negocios: () => jget<Negocio[]>("/negocios"),
  criarNegocio: (n: Partial<Negocio>) => jsend<Negocio>("/negocios", "POST", n),
  atualizarNegocio: (id: number, patch: Partial<Negocio>) => jsend<Negocio>(`/negocios/${id}`, "PATCH", patch),
  clientes: () => jget<ClienteServico[]>("/clientes"),
  frota: () => jget<Frota>("/frota"),
  cs: (implantacaoId: number) => jget<CSRelatorio>(`/cs/${implantacaoId}`),
  contratos: () => jget<ContratosResp>("/contratos"),
};

export const MODALIDADE_LABEL: Record<string, string> = {
  "1_comissao": "Comissão", "2_comissao_majorada": "Comissão+", "3_equity": "Equity",
  "4_reseller": "Reseller", "5_in_loco": "In loco (CLT)",
};
export const HEALTH_COLOR: Record<string, string> = {
  verde: "bg-green-100 text-green-800", amarelo: "bg-amber-100 text-amber-800", vermelho: "bg-red-100 text-red-700",
};
