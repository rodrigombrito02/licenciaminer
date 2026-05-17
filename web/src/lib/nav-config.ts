import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCheck,
  Cpu,
  Database,
  Factory,
  FileSearch,
  FileStack,
  Flame,
  FolderOpen,
  GitBranch,
  Globe,
  Home,
  Layers,
  ListTodo,
  Lock,
  Map,
  MessageSquare,
  Network,
  Scale,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Workflow,
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
    key: "ferramentas-internas",
    label: "Ferramentas Internas",
    description: "Cockpit operacional da Summo — gestão de riscos, projetos, planos de ação e comunicações.",
  },
];

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
      { href: "/pilhas", label: "Conformidade de Pilhas", icon: Layers },
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
    label: "Plano de Ações",
    color: "text-brand-orange",
    group: "ferramentas-internas",
    items: [
      { href: "/planos-de-acao", label: "Cockpit MUSA", icon: ListTodo },
    ],
  },
  {
    label: "Projetos",
    color: "text-brand-orange",
    group: "ferramentas-internas",
    items: [
      { href: "/projetos", label: "PM Suite", icon: FolderOpen },
    ],
  },
  {
    label: "Riscos Corporativos (ERM)",
    color: "text-brand-orange",
    group: "ferramentas-internas",
    items: [
      { href: "/riscos-corporativos", label: "Dashboard ERM", icon: Briefcase },
      { href: "/riscos-corporativos/objetivos", label: "Objetivos (BSC)", icon: Target },
      { href: "/riscos-corporativos/taxonomia-erm", label: "Taxonomia COSO", icon: FileStack },
      { href: "/riscos-corporativos/linhas-defesa", label: "3 Linhas de Defesa", icon: Shield },
      { href: "/riscos-corporativos/snapshots", label: "Snapshots Board", icon: Calendar },
    ],
  },
  {
    label: "Riscos de Projeto",
    color: "text-brand-orange",
    group: "ferramentas-internas",
    items: [
      { href: "/gestao-riscos", label: "Dashboard", icon: ShieldAlert },
      { href: "/gestao-riscos/riscos", label: "Riscos", icon: AlertTriangle },
      { href: "/gestao-riscos/bowtie", label: "Bowtie", icon: GitBranch },
      { href: "/gestao-riscos/planos/acoes", label: "Ações de Risco", icon: ListTodo },
      { href: "/gestao-riscos/planos/controles", label: "Controles", icon: CheckCheck },
      { href: "/gestao-riscos/kris", label: "KRIs (Indicadores)", icon: Activity },
      { href: "/gestao-riscos/apetite", label: "Apetite a Risco", icon: Scale },
      { href: "/gestao-riscos/organograma", label: "Organograma", icon: Network },
      { href: "/gestao-riscos/cadeia-valor", label: "Cadeia de Valor", icon: Workflow },
      { href: "/gestao-riscos/mapeamento", label: "Mapeamento", icon: Map },
      { href: "/gestao-riscos/metodologia", label: "Metodologia", icon: Settings },
    ],
  },
  {
    label: "Gestão de Crises e Continuidade",
    color: "text-brand-orange",
    group: "ferramentas-internas",
    items: [
      { href: "/gestao-crises", label: "Dashboard", icon: Flame },
      { href: "/gestao-crises/cenarios", label: "Cenários", icon: AlertOctagon },
      { href: "/gestao-crises/comites", label: "Comitês", icon: Users },
      { href: "/gestao-crises/simulados", label: "Simulados", icon: CalendarCheck },
      { href: "/gestao-crises/bcp", label: "BCP / Continuidade", icon: FileStack },
    ],
  },
  {
    label: "Comunicações",
    color: "text-brand-orange",
    group: "ferramentas-internas",
    items: [
      { href: "/comunicacoes", label: "Dashboard", icon: MessageSquare },
      { href: "/comunicacoes/stakeholders", label: "Stakeholders", icon: Users },
      { href: "/comunicacoes/templates", label: "Templates", icon: FileStack },
      { href: "/comunicacoes/envios", label: "Envios", icon: Send },
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
  {
    title: "Ferramentas Internas",
    description:
      "Cockpit operacional Summo — gestão de riscos, projetos, planos de ação e comunicações com stakeholders.",
    icon: Workflow,
    href: "/planos-de-acao",
    color: "border-brand-orange/30 hover:border-brand-orange/60",
    iconColor: "text-brand-orange",
  },
] as const;

export const PARTNERS = [
  "Dersalis",
  "UiFlou",
  "Medme",
  "Kofre",
  "Rombit",
] as const;
