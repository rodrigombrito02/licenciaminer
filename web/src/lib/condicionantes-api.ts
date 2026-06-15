/** Cliente do Radar de Condicionantes (SQ Ambiental). */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api")
  .replace(/\/api$/, "") + "/api/condicionantes";

export interface Condicionante {
  id: number;
  licenca_id: number;
  numero: string | null;
  descricao: string;
  prazo_tipo: string;
  prazo_data: string | null;
  prazo_dias: number | null;
  recorrencia: string | null;
  prazo_efetivo: string | null;
  responsavel: string | null;
  status: string;
  status_base: string;
  evidencia: string | null;
}

export interface Licenca {
  id: number;
  categoria?: string;
  empreendimento: string;
  cnpj: string | null;
  orgao: string | null;
  processo: string | null;
  numero_licenca: string | null;
  tipo: string | null;
  data_emissao: string | null;
  data_validade: string | null;
  municipio: string | null;
  uf: string | null;
  lider_responsavel: string | null;
  criado_por: string | null;
  acl: Record<string, string[]> | null;
  n_condicionantes: number;
  resumo_status: Record<string, number>;
  condicionantes?: Condicionante[];
}

export interface CondResumo {
  licencas: number;
  condicionantes: number;
  por_status: Record<string, number>;
  vencendo_30_dias: number;
}

const j = (r: Response) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export const condApi = {
  resumo: () => fetch(`${BASE}/resumo`).then(j) as Promise<CondResumo>,
  listar: () => fetch(`${BASE}`).then(j) as Promise<Licenca[]>,
  obter: (id: number) => fetch(`${BASE}/${id}`).then(j) as Promise<Licenca>,
  criar: (data: Partial<Licenca>) =>
    fetch(`${BASE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(j) as Promise<Licenca>,
  atualizar: (id: number, data: Partial<Licenca>) =>
    fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(j) as Promise<Licenca>,
  deletar: (id: number) => fetch(`${BASE}/${id}`, { method: "DELETE" }),
  addCondicionante: (licId: number, data: Partial<Condicionante>) =>
    fetch(`${BASE}/${licId}/condicionantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(j) as Promise<Licenca>,
  atualizarCondicionante: (condId: number, data: Partial<Condicionante>) =>
    fetch(`${BASE}/condicionantes/${condId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(j) as Promise<Condicionante>,
};

export const COND_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  cumprida: "Cumprida",
  atrasada: "Atrasada",
  nao_aplicavel: "N/A",
};

export const COND_STATUS_COLOR: Record<string, string> = {
  pendente: "bg-gray-100 text-gray-700 border-gray-200",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
  cumprida: "bg-green-100 text-green-800 border-green-200",
  atrasada: "bg-red-100 text-red-700 border-red-200",
  nao_aplicavel: "bg-gray-50 text-gray-400 border-gray-100",
};

export const PRAZO_LABEL: Record<string, string> = {
  data: "Data fixa",
  dias_publicacao: "Dias após publicação",
  recorrente: "Recorrente",
  vigencia: "Durante a vigência",
};
