"use client";

/**
 * Trackeador de pageviews — registra cada navegacao no backend (/api/admin/eventos).
 * Pode ser estendido pra trackear CTAs etc.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRole } from "@/hooks/use-role";

export function PageviewTracker() {
  const pathname = usePathname();
  const roleState = useRole();

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

    const isAuth = roleState.status === "authenticated";
    const payload = {
      tipo: "pageview",
      rota: pathname,
      user_id: isAuth ? roleState.userId : undefined,
      user_email: isAuth ? roleState.email : undefined,
      user_role: isAuth ? roleState.role : "anonimo",
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    };

    fetch(`${API}/admin/eventos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* silencioso — tracking nao deve quebrar UX */
    });
  }, [pathname, roleState]);

  return null;
}
