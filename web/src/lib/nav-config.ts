import {
  AlertTriangle,
  Briefcase,
  Building2,
  Cpu,
  Crosshair,
  GitBranch,
  Globe,
  Home,
  Layers,
  ListTodo,
  Lock,
  Map,
  MessageSquare,
  ShieldCheck,
  Target,
  TrendingUp,
  Workflow,
  FolderOpen,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface NavSection {
  label: string;
  color?: string;
  standalone?: boolean;
  group?: string;
  items: NavItem[];
}

export interface NavGroup {
  key: string;
  label: string;
  description?: string;
  /** Se true (default), o grupo é um accordion colapsável. Produtos = false (sempre expostos). */
  collapsible?: boolean;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "produtos",
    label: "Produtos Comerciais",
    description: "Caixas com cara externa — vendáveis para clientes",
    collapsible: false,
  },
  {
    key: "ferramentas-internas",
    label: "Ferramentas Internas",
    description: "Cockpit operacional Summo — apoio aos projetos de cliente",
    collapsible: true,
  },
  {
    key: "gestao",
    label: "Gestão da Plataforma",
    description: "Restrito a sócios e administradores",
    collapsible: true,
  },
];

/**
 * Sidebar minimalista — apenas CAPAS de cada módulo.
 * Sub-funcionalidades ficam dentro de cada capa (com botões grandes ou abas internas).
 * Quem chega aqui não precisa decorar 30+ rotas — navega pelas capas.
 */
export const NAV_SECTIONS: NavSection[] = [
  // ── Inicio (standalone)
  {
    label: "",
    standalone: true,
    items: [{ href: "/", label: "Início", icon: Home }],
  },

  // ── Produtos Comerciais (4 caixas, cada uma e um link direto)
  {
    label: "",
    standalone: true,
    group: "produtos",
    items: [{ href: "/ambiental", label: "SQ Ambiental", icon: ShieldCheck }],
  },
  {
    label: "",
    standalone: true,
    group: "produtos",
    items: [{ href: "/direitos", label: "Ativos Minerários", icon: Map }],
  },
  {
    label: "",
    standalone: true,
    group: "produtos",
    items: [{ href: "/inteligencia-comercial", label: "Mineral Intelligence", icon: TrendingUp }],
  },
  {
    label: "",
    standalone: true,
    group: "produtos",
    items: [{ href: "/sq-consultoria", label: "SQ Consultoria", icon: Briefcase }],
  },
  {
    label: "",
    standalone: true,
    group: "produtos",
    items: [{ href: "/sq-solutions", label: "SQ Soluções", icon: Cpu }],
  },

  // ── Ferramentas Internas (lista direta, sem sub-accordion)
  {
    label: "",
    standalone: true,
    group: "ferramentas-internas",
    items: [
      { href: "/ferramentas-internas", label: "Visão geral", icon: Workflow },
      { href: "/mapeamentos", label: "Mapeamentos", icon: Crosshair },
      { href: "/planos-de-acao", label: "Plano de Ações", icon: ListTodo },
      { href: "/projetos", label: "Projetos", icon: FolderOpen },
      { href: "/riscos", label: "Riscos", icon: AlertTriangle },
      { href: "/gestao-crises", label: "Crises", icon: AlertTriangle },
      { href: "/comunicacoes", label: "Comunicações", icon: MessageSquare },
      { href: "/oportunidades", label: "Funil / Oportunidades", icon: Target },
      { href: "/captacao", label: "Captação", icon: TrendingUp },
    ],
  },

  // ── Gestão (admin) — lista direta
  {
    label: "",
    standalone: true,
    group: "gestao",
    items: [
      { href: "/admin", label: "Painel Admin", icon: Briefcase },
      { href: "/evolucao", label: "Evolução do Sistema", icon: GitBranch },
      { href: "/gestao-interna", label: "Gestão Interna", icon: Lock, disabled: true },
    ],
  },
];

/** Cards visíveis na landing/home pra visitante */
export const BUSINESS_UNITS = [
  {
    title: "SQ Ambiental",
    description: "Análise de dados regulatórios, viabilidade preliminar e Diligência Summo (DD ambiental + pilhas).",
    icon: ShieldCheck,
    href: "/ambiental",
    color: "border-brand-teal/30 hover:border-brand-teal/60",
    iconColor: "text-brand-teal",
  },
  {
    title: "Ativos Minerários",
    description: "Mapa multi-camadas, prospecção por teses e ciclo de vida do direito — da geologia à operação.",
    icon: Map,
    href: "/direitos",
    color: "border-brand-teal/30 hover:border-brand-teal/60",
    iconColor: "text-brand-teal",
  },
  {
    title: "Mineral Intelligence",
    description: "Inteligência de mercado mineral: preços, comércio exterior, royalties, produção.",
    icon: TrendingUp,
    href: "/inteligencia-comercial",
    color: "border-brand-gold/30 hover:border-brand-gold/60",
    iconColor: "text-brand-gold",
  },
  {
    title: "SQ Consultoria",
    description: "Diagnóstico, gestão de riscos e crises, gestão estratégica de projetos e corporativa.",
    icon: Briefcase,
    href: "/sq-consultoria",
    color: "border-brand-navy/30 hover:border-brand-navy/60",
    iconColor: "text-brand-navy",
  },
  {
    title: "SQ Soluções",
    description: "Soluções digitais com IA, parcerias tecnológicas e projetos de segurança operacional.",
    icon: Cpu,
    href: "/sq-solutions",
    color: "border-brand-orange/30 hover:border-brand-orange/60",
    iconColor: "text-brand-orange",
  },
  {
    title: "Ferramentas Internas",
    description: "Cockpit operacional Summo — riscos, projetos, planos de ação, comunicações.",
    icon: Workflow,
    href: "/ferramentas-internas",
    color: "border-brand-orange/30 hover:border-brand-orange/60",
    iconColor: "text-brand-orange",
  },
  {
    title: "Gestão Interna",
    description: "Área restrita — gestão operacional e financeira da Summo.",
    icon: Lock,
    href: "#",
    color: "border-border opacity-50",
    iconColor: "text-muted-foreground",
    disabled: true,
  },
] as const;

export const PARTNERS = [
  "Dersalis",
  "UiFlou",
  "Medme",
  "Kofre",
  "Rombit",
] as const;
