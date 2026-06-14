/**
 * Cliente do módulo Ativos Minerários — painel do ativo (trilha + portfólio).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export interface AtivoIdentidade {
  processo: string | null;
  processo_norm: string | null;
  titular: string | null;
  cpf_cnpj: string | null;
  substancia: string | null;
  municipio: string | null;
  fase_atual: string | null;
  regime: string | null;
  area_ha: number | null;
  situacao: string | null;
  ult_evento: string | null;
}

export interface TrilhaEtapa {
  ordem: number;
  key: string;
  label: string;
  descricao: string;
  status: "concluida" | "atual" | "futura";
}

export interface TrilhaPrazo {
  codigo: string;
  evento: string;
  prazo: string;
  base: string;
  recorrente: boolean;
  fonte: string;
  proximo?: string;
  dias_restantes?: number;
}

export interface Trilha {
  etapa_atual: number | null;
  etapa_label: string | null;
  regime_especial: string | null;
  etapas: TrilhaEtapa[];
  prazos: TrilhaPrazo[];
  countdown: { vencimento: string; dias_restantes: number } | null;
  data_publicacao: string | null;
  observacao: string | null;
}

export interface PortfolioResumo {
  cpf_cnpj: string;
  titular: string | null;
  total_direitos: number;
  outros_direitos: number;
}

export interface AtivoDetail {
  view: string;
  identidade: AtivoIdentidade;
  trilha: Trilha;
  portfolio: PortfolioResumo | null;
  scm_url: string;
}

export interface PortfolioDireito {
  processo_norm: string | null;
  processo: string | null;
  titular: string | null;
  fase_atual: string | null;
  regime: string | null;
  substancia_principal: string | null;
  municipio_principal: string | null;
}

export interface Portfolio {
  view: string;
  cpf_cnpj: string;
  titular: string | null;
  total_direitos: number;
  por_fase: Record<string, number>;
  por_substancia: Record<string, number>;
  direitos: PortfolioDireito[];
}

export interface PromoverResult {
  oportunidade_id: number;
  criado: boolean;
  etapa: string;
  titulo: string;
}

export interface CamadaContexto {
  score: number;
  evidencia: string;
  confianca: string;
}

export interface AtivoContexto {
  processo: string;
  municipio: string | null;
  camadas: Record<string, CamadaContexto>;
}

export const ativosApi = {
  async detail(processo: string): Promise<AtivoDetail> {
    const res = await fetch(`${API_BASE}/ativos/detail?processo=${encodeURIComponent(processo)}`);
    if (!res.ok) throw new Error(`Falha ao carregar ativo (${res.status})`);
    return res.json();
  },
  async portfolio(cnpj: string, limit = 200): Promise<Portfolio> {
    const res = await fetch(`${API_BASE}/ativos/portfolio?cnpj=${encodeURIComponent(cnpj)}&limit=${limit}`);
    if (!res.ok) throw new Error(`Falha ao carregar portfólio (${res.status})`);
    return res.json();
  },
  async promover(processo: string, criadoPor?: string): Promise<PromoverResult> {
    const res = await fetch(`${API_BASE}/ativos/promover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processo, criado_por: criadoPor }),
    });
    if (!res.ok) throw new Error(`Falha ao promover (${res.status})`);
    return res.json();
  },
  async contexto(processo: string): Promise<AtivoContexto> {
    const res = await fetch(`${API_BASE}/ativos/contexto?processo=${encodeURIComponent(processo)}`);
    if (!res.ok) throw new Error(`Falha ao carregar contexto (${res.status})`);
    return res.json();
  },
};

// Paleta e legenda da Trilha do Ativo (cor por etapa do ciclo de vida).
// Em módulo SSR-safe (sem deps de browser) para poder ser importado tanto
// pelo mapa quanto pelo componente do mapa (carregado via dynamic ssr:false).
export const ETAPA_COLORS: Record<string, string> = {
  "1": "#94A3B8", // Requerimento de Pesquisa
  "2": "#38BDF8", // Autorização de Pesquisa
  "3": "#6366F1", // Relatório Final de Pesquisa
  "4": "#F59E0B", // Requerimento de Lavra
  "5": "#22C55E", // Concessão de Lavra
  "6": "#0E7490", // Operação
  especial: "#A855F7",
  outro: "#CBD5E1",
};

export const ETAPA_LEGEND: Record<string, string> = {
  "1": "1· Req. Pesquisa",
  "2": "2· Autorização Pesquisa",
  "3": "3· Relatório Final",
  "4": "4· Req. Lavra",
  "5": "5· Concessão Lavra",
  "6": "6· Operação",
  especial: "Regime especial",
  outro: "Outro",
};

/* ── Trilha resumida a partir da fase ANM (espelha o motor do backend) ──
 * Usado em vistas leves (ex: card do Funil) onde não vale buscar o detalhe inteiro.
 * Fonte de verdade do stepper completo continua sendo o backend. */
const ETAPA_LABELS = [
  "Requerimento de Pesquisa",
  "Autorização de Pesquisa",
  "Relatório Final de Pesquisa",
  "Requerimento de Lavra",
  "Concessão de Lavra",
  "Operação",
];

export interface TrilhaResumo {
  ordem: number | null;
  total: number;
  label: string | null;
  especial: string | null;
}

export function trilhaResumoFromFase(fase: string | null | undefined): TrilhaResumo {
  const total = ETAPA_LABELS.length;
  const f = (fase ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  if (!f) return { ordem: null, total, label: null, especial: null };
  if (f.includes("garimpeira") || f.includes("plg")) return { ordem: null, total, label: null, especial: "Lavra Garimpeira (PLG)" };
  if (f.includes("disponibil")) return { ordem: null, total, label: null, especial: "Disponibilidade" };
  if (f.includes("licenciamento")) return { ordem: null, total, label: null, especial: "Licenciamento" };
  let ordem: number | null = null;
  if (f.includes("requerimento de pesquisa")) ordem = 1;
  else if (f.includes("autorizacao de pesquisa")) ordem = 2;
  else if (f.includes("relatorio")) ordem = 3;
  else if (f.includes("requerimento de lavra")) ordem = 4;
  else if (f.includes("concessao de lavra") || f.includes("portaria de lavra")) ordem = 5;
  else if (f.includes("lavra")) ordem = 5;
  return { ordem, total, label: ordem ? ETAPA_LABELS[ordem - 1] : null, especial: null };
}
