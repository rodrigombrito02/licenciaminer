"use client";

/**
 * Decide a casca conforme o papel:
 *  - visitante NÃO logado → MarketingShell (vitrine pública, top-nav horizontal)
 *  - logado (visitante pago, consultor, admin) → app interno (sidebar + header)
 */

import { useRole } from "@/hooks/use-role";
import { SidebarNav } from "@/components/sidebar-nav";
import { Header } from "@/components/header";
import { ChatSidebar } from "@/components/chat-sidebar";
import { MarketingShell } from "@/components/marketing-shell";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const role = useRole();

  if (role.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-brand-teal border-t-transparent animate-spin" />
      </div>
    );
  }

  if (role.status === "anonymous") {
    return <MarketingShell>{children}</MarketingShell>;
  }

  // Logado → app interno
  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Header />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <ChatSidebar />
    </div>
  );
}
