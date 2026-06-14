"use client";

/**
 * Papel "efetivo" = papel real do usuário, possivelmente sobreposto pelo modo
 * "Ver como" (preview). Use este hook em UI que depende de role para que o
 * seletor de visualização funcione. Para o papel REAL (ex: o próprio seletor,
 * tracking), use useRole diretamente.
 */

import { useRole, type RoleState } from "@/hooks/use-role";
import { useViewAs } from "@/lib/view-as";
import { hasMinRole, type Role } from "@/lib/roles";

export function useEffectiveRole(): RoleState {
  const real = useRole();
  const { viewAs } = useViewAs();

  if (!viewAs) return real;
  // Só usuários autenticados consultor+ podem simular outro papel
  if (real.status !== "authenticated") return real;
  if (!hasMinRole(real.role, "consultor")) return real;
  // Consultor não pode simular admin
  if (viewAs === "admin" && real.role !== "admin") return real;

  if (viewAs === "anonymous") {
    return { status: "anonymous" };
  }

  // Estado autenticado sintético: papel simulado, identidade real preservada
  return { ...real, role: viewAs as Role };
}
