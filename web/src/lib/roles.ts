/**
 * Sistema de 4 niveis de acesso da plataforma Summo Quartile.
 *
 * Os 4 roles em ordem crescente de privilegio:
 *   visitante_free  → acesso publico limitado (vitrine, indicadores agregados)
 *   visitante_pago  → vitrine completa + analise preliminar de licenciamento +
 *                     parte da mineradora modelo
 *   consultor       → todas as ferramentas internas (riscos, planos, projetos,
 *                     comunicacoes, crises)
 *   admin           → tudo do consultor + gestao da plataforma (oportunidades,
 *                     dashboards de trafego, gestao de usuarios)
 */

export type Role =
  | "visitante_free"
  | "visitante_pago"
  | "consultor"
  | "admin";

export interface UserMetadata {
  role?: Role;
  nome?: string;
  area?: string;
}

/** Ordem hierarquica — index maior = privilegio maior */
const ROLE_ORDER: Role[] = [
  "visitante_free",
  "visitante_pago",
  "consultor",
  "admin",
];

/** Retorna true se userRole tem pelo menos o nivel de minRole */
export function hasMinRole(userRole: Role | undefined, minRole: Role): boolean {
  if (!userRole) return false;
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
}

/** Retorna true se userRole esta na lista de allowed */
export function hasAnyRole(userRole: Role | undefined, allowed: Role[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}

/** Label amigavel do role para UI */
export const ROLE_LABEL: Record<Role, string> = {
  visitante_free: "Visitante",
  visitante_pago: "Visitante Premium",
  consultor: "Consultor Summo",
  admin: "Administrador",
};

/** Cor de badge associada ao role */
export const ROLE_COLOR: Record<Role, string> = {
  visitante_free: "bg-gray-200 text-gray-800",
  visitante_pago: "bg-amber-100 text-amber-800",
  consultor: "bg-brand-teal/20 text-brand-teal",
  admin: "bg-brand-navy/20 text-brand-navy",
};

/* ══════════════════════════════════════════════════════════════════
   Mapa de protecao de rotas — usado pelo middleware
   ══════════════════════════════════════════════════════════════════ */

/**
 * Rotas PUBLICAS (acessiveis sem login). Visitante anonimo pode ver.
 * Mantemos vitrine de produtos aqui para atrair leads.
 */
export const PUBLIC_PATHS: string[] = [
  "/",                          // Home (3 versoes conforme role; sem login mostra vitrine)
  "/login",
  "/auth",
  "/ambiental",                 // Capa do ambiental com 3 botoes
  "/explorar",                  // Explorar dados publicos (com limites em visitante_free)
  "/inteligencia-comercial",    // Mercado mineral publico
  "/mapa",                      // Mapa geoespacial publico
  "/concessoes",                // Concessoes ANM publico
  "/prospeccao",                // Prospeccao publica
  "/seguranca",                 // SQ Solutions
  "/mineradora-modelo",         // Demo da SQ Solutions
];

/** Rotas que precisam de pelo menos visitante_pago */
export const PAGO_PATHS: string[] = [
  "/viabilidade",               // Analise preliminar de licenciamento
  "/empresa",                   // Consulta por CNPJ
  "/decisoes",                  // Analise de decisoes
];

/** Rotas de uso interno (consultor+) */
export const CONSULTOR_PATHS: string[] = [
  "/due-diligence",
  "/pilhas",
  "/planos-de-acao",
  "/projetos",
  "/riscos-corporativos",
  "/gestao-riscos",
  "/gestao-crises",
  "/comunicacoes",
];

/** Rotas restritas a admin/socios */
export const ADMIN_PATHS: string[] = [
  "/oportunidades",
  "/admin",
  "/gestao-interna",
];

/** Decide qual role minimo a rota exige */
export function requiredRoleForPath(pathname: string): Role | "public" {
  for (const p of ADMIN_PATHS) {
    if (pathname === p || pathname.startsWith(p + "/")) return "admin";
  }
  for (const p of CONSULTOR_PATHS) {
    if (pathname === p || pathname.startsWith(p + "/")) return "consultor";
  }
  for (const p of PAGO_PATHS) {
    if (pathname === p || pathname.startsWith(p + "/")) return "visitante_pago";
  }
  // Tudo o mais e tratado como publico (Home/vitrine)
  return "public";
}
