import {
  BarChart3,
  Building2,
  Cpu,
  Database,
  Factory,
  FileSearch,
  Globe,
  Home,
  Lock,
  Map,
  Search,
  Shield,
  ShieldCheck,
  TrendingUp,
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
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "",
    standalone: true,
    items: [{ href: "/", label: "Início", icon: Home }],
  },
  {
    label: "Summo Ambiental",
    color: "text-brand-teal",
    items: [
      { href: "/explorar", label: "Base de Dados", icon: Database },
      { href: "/empresa", label: "Consulta Empresa", icon: Building2 },
      { href: "/decisoes", label: "Análise de Decisões", icon: BarChart3 },
      { href: "/viabilidade", label: "Viabilidade", icon: Search },
      { href: "/due-diligence", label: "Due Diligence", icon: ShieldCheck },
    ],
  },
  {
    label: "Direitos e Concessões",
    color: "text-brand-teal",
    items: [
      { href: "/concessoes", label: "Concessões", icon: FileSearch },
      { href: "/mapa", label: "Mapa Geoespacial", icon: Map },
      { href: "/prospeccao", label: "Prospecção", icon: TrendingUp },
    ],
  },
  {
    label: "Mineral Intelligence",
    color: "text-brand-gold",
    items: [
      { href: "/inteligencia-comercial", label: "Inteligência Comercial", icon: Globe },
      { href: "/monitoramento", label: "Monitoramento", icon: Search },
    ],
  },
  {
    label: "SQ Solutions",
    color: "text-brand-orange",
    items: [
      { href: "/seguranca", label: "Segurança", icon: Shield },
      { href: "/mineradora-modelo", label: "Mineradora Modelo", icon: Factory },
    ],
  },
  {
    label: "Gestão Interna",
    color: "text-sidebar-foreground/40",
    items: [
      { href: "/gestao-interna", label: "Painel Interno", icon: Lock, disabled: true },
    ],
  },
];

/** Business unit cards for the landing page */
export const BUSINESS_UNITS = [
  {
    title: "Summo Ambiental",
    description:
      "Análise e conformidade em licenciamento ambiental. Due diligence, viabilidade e base de dados regulatória.",
    icon: ShieldCheck,
    href: "/due-diligence",
    color: "border-brand-teal/30 hover:border-brand-teal/60",
    iconColor: "text-brand-teal",
  },
  {
    title: "Direitos e Concessões Minerárias",
    description:
      "Mapeamento geoespacial de concessões, prospecção de oportunidades e análise para investidores.",
    icon: Map,
    href: "/mapa",
    color: "border-brand-teal/30 hover:border-brand-teal/60",
    iconColor: "text-brand-teal",
  },
  {
    title: "Mineral Intelligence",
    description:
      "Inteligência de mercado, cotações, comércio exterior e monitoramento de indicadores da mineração brasileira.",
    icon: TrendingUp,
    href: "/inteligencia-comercial",
    color: "border-brand-gold/30 hover:border-brand-gold/60",
    iconColor: "text-brand-gold",
  },
  {
    title: "SQ Solutions",
    description:
      "Soluções digitais de segurança e saúde no trabalho. IA aplicada à gestão de operações minerárias.",
    icon: Cpu,
    href: "/mineradora-modelo",
    color: "border-brand-orange/30 hover:border-brand-orange/60",
    iconColor: "text-brand-orange",
  },
  {
    title: "Gestão Interna",
    description: "Área restrita — gestão operacional e financeira.",
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
