"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchFreshness } from "@/lib/api";
import { NAV_GROUPS, NAV_SECTIONS, type NavSection } from "@/lib/nav-config";

const COLLAPSE_KEY = "sidebar_collapsed_v2";
const GROUP_COLLAPSE_KEY = "sidebar_group_collapsed_v2";

export function SidebarNav() {
  const pathname = usePathname();
  const [freshness, setFreshness] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [groupCollapsed, setGroupCollapsed] = useState<Record<string, boolean>>({});

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem(COLLAPSE_KEY);
      if (s) setCollapsed(JSON.parse(s));
      const g = localStorage.getItem(GROUP_COLLAPSE_KEY);
      if (g) setGroupCollapsed(JSON.parse(g));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed)); } catch {}
  }, [collapsed]);
  useEffect(() => {
    try { localStorage.setItem(GROUP_COLLAPSE_KEY, JSON.stringify(groupCollapsed)); } catch {}
  }, [groupCollapsed]);

  useEffect(() => {
    let cancelled = false;
    fetchFreshness()
      .then((r) => { if (!cancelled) setFreshness(r.last_updated); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function toggleGroup(key: string) {
    setGroupCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function isGroupCollapsed(key: string) {
    // Default: collapsed unless user expanded OR any item active
    if (key in groupCollapsed) return groupCollapsed[key];
    const groupSections = NAV_SECTIONS.filter((s) => s.group === key);
    const anyActive = groupSections.some((s) => isSectionActive(s));
    return !anyActive;
  }

  function isSectionActive(section: NavSection) {
    return section.items.some((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    );
  }

  function toggleSection(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function isSectionCollapsed(section: NavSection) {
    if (section.standalone) return false;
    // If user explicitly toggled, use that. Otherwise, collapse if not active.
    if (section.label in collapsed) return collapsed[section.label];
    return !isSectionActive(section);
  }

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <Image src="/logo2.png" alt="Summo Quartile" width={32} height={32} className="rounded-lg" />
        <div>
          <span className="font-heading text-sm font-bold tracking-tight text-white">
            Summo Quartile
          </span>
          <span className="block text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
            Inteligência Mineral
          </span>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_SECTIONS.map((section, idx) => {
          const isOpen = !isSectionCollapsed(section);
          const active = isSectionActive(section);
          const prevSection = idx > 0 ? NAV_SECTIONS[idx - 1] : null;
          const groupChanged = section.group && section.group !== prevSection?.group;
          const groupMeta = groupChanged
            ? NAV_GROUPS.find((g) => g.key === section.group)
            : null;
          const groupConf = section.group
            ? NAV_GROUPS.find((g) => g.key === section.group)
            : null;
          // Grupos sao accordion por padrao; Produtos Comerciais fica sempre exposto.
          const groupCollapsible = groupConf?.collapsible ?? true;
          const groupHidden =
            groupCollapsible && section.group ? isGroupCollapsed(section.group) : false;

          return (
            <div key={idx}>
              {/* Cabecalho do grupo (renders once per group) */}
              {groupMeta &&
                (groupCollapsible ? (
                  <button
                    onClick={() => toggleGroup(groupMeta.key)}
                    className="mt-5 mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground/80 transition-colors border-t border-sidebar-border pt-3"
                    title={groupMeta.description}
                  >
                    <span>{groupMeta.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        isGroupCollapsed(groupMeta.key) ? "-rotate-90" : "rotate-0"
                      )}
                    />
                  </button>
                ) : (
                  <div
                    className="mt-5 mb-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50 border-t border-sidebar-border pt-3"
                    title={groupMeta.description}
                  >
                    {groupMeta.label}
                  </div>
                ))}

              {groupHidden ? null : section.standalone ? (
                /* Standalone item — link direto, sem header */
                <ul>
                  {section.items.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <>
                  {/* Collapsible section header */}
                  <button
                    onClick={() => toggleSection(section.label)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                      active
                        ? (section.color ?? "text-sidebar-foreground/60")
                        : "text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
                    )}
                  >
                    {section.label}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        isOpen ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </button>

                  {/* Section items */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <ul className="space-y-0.5 pb-2">
                      {section.items.map((item) => {
                        const isActive =
                          item.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.href);
                        const disabled = item.disabled;
                        return (
                          <li key={item.href}>
                            <Link
                              href={disabled ? "#" : item.href}
                              aria-disabled={disabled || undefined}
                              tabIndex={disabled ? -1 : undefined}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 pl-6 text-sm transition-colors",
                                disabled
                                  ? "pointer-events-none text-sidebar-foreground/25"
                                  : isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                              )}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              {item.label}
                              {disabled && (
                                <span className="ml-auto text-[9px] uppercase tracking-wider text-sidebar-foreground/20">
                                  Em breve
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-5 py-3 space-y-1.5">
        <p className="text-[10px] leading-relaxed text-sidebar-foreground/40">
          Fontes públicas oficiais · Cada registro rastreável à origem
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/25">
          {freshness && (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Dados: {freshness}</span>
              <span>&middot;</span>
            </>
          )}
          <span>v0.2.0</span>
        </div>
      </div>
    </aside>
  );
}
