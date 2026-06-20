"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS, NAV_SECTIONS, type NavSection } from "@/lib/nav-config";
import { useEffectiveRole } from "@/hooks/use-effective-role";
import { hasMinRole, type Role } from "@/lib/roles";
import { UserMenu } from "@/components/user-menu";
import { ViewAsSwitcher } from "@/components/view-as-switcher";

// Papel mínimo por grupo de navegação (mesmo gating do sidebar-nav)
const GROUP_MIN_ROLE: Record<string, Role> = {
  "ferramentas-internas": "consultor",
  "gestao": "admin",
};

export function Header() {
  const pathname = usePathname();
  const roleState = useEffectiveRole();
  const role = roleState.status === "authenticated" ? roleState.role : undefined;
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleSection(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  // Filtra seções pelo papel: grupos internos/admin só para consultor/admin
  const visibleSections = NAV_SECTIONS.filter((s) => {
    const min = s.group ? GROUP_MIN_ROLE[s.group] : undefined;
    return !min || hasMinRole(role, min);
  });

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-8">
      {/* Mobile menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
            <Image src="/logo2.png" alt="Summo Quartile" width={20} height={20} className="rounded" />
            <span className="font-heading text-sm font-bold text-white">
              Summo Quartile
            </span>
          </div>
          <nav className="px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-64px)]">
            {visibleSections.map((section, idx) => {
              const active = section.items.some((item) =>
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
              );
              const isOpen = section.standalone || (section.label in collapsed ? !collapsed[section.label] : active);

              // Cabeçalho de grupo (renderizado uma vez por grupo)
              const prevSection: NavSection | null = idx > 0 ? visibleSections[idx - 1] : null;
              const groupChanged = section.group && section.group !== prevSection?.group;
              const groupMeta = groupChanged
                ? NAV_GROUPS.find((g) => g.key === section.group)
                : null;

              return (
                <div key={idx}>
                  {groupMeta && (
                    <div className="mt-5 mb-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50 border-t border-sidebar-border pt-3">
                      {groupMeta.label}
                    </div>
                  )}
                  {section.standalone ? (
                    <ul>
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleSection(section.label)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider",
                          active
                            ? (section.color ?? "text-sidebar-foreground/60")
                            : "text-sidebar-foreground/40"
                        )}
                      >
                        {section.label}
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
                      </button>
                      <div className={cn("overflow-hidden transition-all", isOpen ? "max-h-96" : "max-h-0")}>
                        <ul className="space-y-0.5 pb-2">
                          {section.items.map((item) => {
                            if (item.disabled) {
                              return (
                                <li key={item.href}>
                                  <span className="flex items-center gap-3 rounded-lg px-3 py-2 pl-6 text-sm text-sidebar-foreground/25 cursor-not-allowed">
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                    <span className="ml-auto text-[9px] uppercase tracking-wider">Em breve</span>
                                  </span>
                                </li>
                              );
                            }
                            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                            return (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  onClick={() => setOpen(false)}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 pl-6 text-sm transition-colors",
                                    isActive
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                  )}
                                >
                                  <item.icon className="h-4 w-4" />
                                  {item.label}
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
        </SheetContent>
      </Sheet>

      {/* Breadcrumb / page context */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <ViewAsSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
