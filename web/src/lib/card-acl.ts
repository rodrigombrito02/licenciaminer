/**
 * ACL de cards internos (mapeamentos, oportunidades, projetos...).
 *
 * Padrao: todos da Summo veem e editam; o criador pode restringir a um
 * subconjunto de membros internos. Admin sempre vê e edita tudo. Nunca
 * visível a visitantes (garantido pelo RoleGate consultor+ nas rotas).
 *
 * ACL: { pode_ver?: string[]; pode_editar?: string[] } — listas de primeiros
 * nomes. Lista vazia/ausente = todos os internos.
 */

export interface CardAcl {
  pode_ver?: string[];
  pode_editar?: string[];
}

export interface MembroSummo {
  nome: string;
  papel: string;
}

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api")
  .replace(/\/api$/, "") + "/api/membros";

export function fetchMembros(): Promise<MembroSummo[]> {
  return fetch(API).then((r) => (r.ok ? r.json() : []));
}

function primeiro(nome: string | null | undefined): string {
  return (nome ?? "").trim().split(" ")[0].toLowerCase();
}

function naLista(lista: string[] | undefined, meuPrimeiro: string): boolean {
  if (!lista || lista.length === 0) return true; // vazio = todos
  return lista.some((n) => primeiro(n) === meuPrimeiro);
}

interface AclCtx {
  acl?: CardAcl | null;
  lider?: string | null;
  criador?: string | null;
  meuNome: string;
  isAdmin: boolean;
}

export function podeVer({ acl, lider, criador, meuNome, isAdmin }: AclCtx): boolean {
  if (isAdmin) return true;
  const me = primeiro(meuNome);
  if (me && (me === primeiro(lider) || me === primeiro(criador))) return true;
  return naLista(acl?.pode_ver, me);
}

export function podeEditar({ acl, lider, criador, meuNome, isAdmin }: AclCtx): boolean {
  if (isAdmin) return true;
  const me = primeiro(meuNome);
  if (me && (me === primeiro(lider) || me === primeiro(criador))) return true;
  return naLista(acl?.pode_editar, me);
}

/** Só o criador, o líder ou um admin podem alterar a configuração de acesso. */
export function podeGerenciarAcesso({ lider, criador, meuNome, isAdmin }: Omit<AclCtx, "acl">): boolean {
  if (isAdmin) return true;
  const me = primeiro(meuNome);
  return !!me && (me === primeiro(lider) || me === primeiro(criador));
}

/** true se a ACL restringe acesso (não é "todos"). */
export function temRestricao(acl?: CardAcl | null): boolean {
  return !!(acl && ((acl.pode_ver?.length ?? 0) > 0 || (acl.pode_editar?.length ?? 0) > 0));
}
