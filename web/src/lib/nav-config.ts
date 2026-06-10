import {
  AlertTriangle,
  Briefcase,
  Building2,
  Cpu,
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
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "produtos",
    label: "Produtos Comerciais",
    description: "Caixas com cara externa — vendáveis para clientes",
  },
  {
    key: "ferramentas-internas",
    label: "Ferramentas Internas",
    description: "Cockpit operacional Summo — apoio aos projetos de cliente",
  },
  {
    key: "gestao",
    label: "Gestão da Plataforma",
    description: "Restrito a sócios e administradores",
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

  // ── Produtos Comerciais (4 caixas)
  {
    label: "Summo Ambiental",
    color: "text-brand-teal",
    group: "produtos",
    items: [
      { href: "/ambiental", label: "Capa", icon: ShieldCheck },
    ],
  },
  {
    label: "Direitos e Concessões",
    color: "text-brand-teal",
    group: "produtos",
    items: [
      { href: "/direitos", label: "Capa", icon: Map },
    ],
  },
  {
    label: "Mineral Intelligence",
    color: "text-brand-gold",
    group: "produtos",
    items: [
      { href: "/inteligencia-comercial", label: "Capa", icon: TrendingUp },
    ],
  },
  {
    label: "SQ Solutions",
    color: "text-brand-orange",
    group: "produtos",
    items: [
      { href: "/sq-solutions", label: "Capa", icon: Cpu },
    ],
  },

  // ── Ferramentas Internas (6 ferramentas, 1 item por ferramenta)
  {
    label: "Ferramentas",
    color: "text-brand-orange",
    group: "ferramentas-internas",
    items: [
      { href: "/ferramentas-internas", label: "Visão geral", icon: Workflow },
      { href: "/planos-de-acao", label: "Plano de Ações", icon: ListTodo },
      { href: "/projetos", label: "Projetos", icon: FolderOpen },
      { href: "/riscos", label: "Riscos", icon: AlertTriangle },
      { href: "/gestao-crises", label: "Crises", icon: AlertTriangle },
      { href: "/comunicacoes", label: "Comunicações", icon: MessageSquare },
      { href: "/oportunidades", label: "Oportunidades", icon: Target },
    ],
  },

  // ── Gestão (admin)
  {
    label: "Gestão",
    color: "text-sidebar-foreground/50",
    group: "gestao",
    items: [
      { href: "/admin", label: "Painel Admin", icon: Briefcase, disabled: true },
      { href: "/gestao-interna", label: "Gestão Interna", icon: Lock, disabled: true },
    ],
  },
];

/** Cards visíveis na landing/home pra visitante */
export const BUSINESS_UNITS = [
  {
    title: "Summo Ambiental",
    description: "Análise de dados regulatórios, viabilidade preliminar e Diligência Summo (DD ambiental + pilhas).",
    icon: ShieldCheck,
    href: "/ambiental",
    color: "border-brand-teal/30 hover:border-brand-teal/60",
    iconColor: "text-brand-teal",
  },
  {
    title: "Direitos e Concessões Minerárias",
    description: "Mapa interativo, prospecção e análise de concessões minerárias do Brasil.",
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
    title: "SQ Solutions",
    description: "Soluções digitais com IA — Mineradora Modelo demo e segurança operacional.",
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
