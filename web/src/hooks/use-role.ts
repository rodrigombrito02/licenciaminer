"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { type Role, type UserMetadata } from "@/lib/roles";

/**
 * Hook que retorna o role do usuario logado.
 *
 * Estados:
 *   - { status: "loading" } enquanto carrega
 *   - { status: "anonymous" } se nao logado
 *   - { status: "authenticated", role, email, nome } se logado
 */

export interface RoleAnonymous {
  status: "anonymous";
}

export interface RoleLoading {
  status: "loading";
}

export interface RoleAuthenticated {
  status: "authenticated";
  role: Role;
  email: string;
  nome: string;
  area?: string;
  userId: string;
}

export type RoleState = RoleAnonymous | RoleLoading | RoleAuthenticated;

export function useRole(): RoleState {
  const [state, setState] = useState<RoleState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setState({ status: "anonymous" });
        return;
      }
      const meta = (user.user_metadata as UserMetadata) || {};
      const role: Role = meta.role || "visitante_free";
      setState({
        status: "authenticated",
        role,
        email: user.email || "",
        nome: meta.nome || user.email || "Usuário",
        area: meta.area,
        userId: user.id,
      });
    }

    load();

    // Escuta mudanças de auth (logout, refresh, etc.)
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      cancelled = true;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  return state;
}
