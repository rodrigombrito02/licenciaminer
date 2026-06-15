"use client";

/**
 * Componente declarativo para mostrar/esconder UI conforme role.
 *
 *   <RoleGate allowed={["admin"]}>
 *     <Button>Acao restrita</Button>
 *   </RoleGate>
 *
 *   <RoleGate minRole="consultor" fallback={<UpgradeCard />}>
 *     <FerramentaInterna />
 *   </RoleGate>
 */

import type { ReactNode } from "react";
import { useEffectiveRole } from "@/hooks/use-effective-role";
import { hasAnyRole, hasMinRole, type Role } from "@/lib/roles";

interface RoleGateProps {
  /** Lista de roles permitidos (ou) */
  allowed?: Role[];
  /** Role minimo (hierarquico) */
  minRole?: Role;
  /** O que mostrar se nao tem permissao (default: null = esconde) */
  fallback?: ReactNode;
  /** Conteudo a mostrar se nao logado (default: igual fallback) */
  anonymous?: ReactNode;
  children: ReactNode;
}

export function RoleGate({
  allowed,
  minRole,
  fallback = null,
  anonymous,
  children,
}: RoleGateProps) {
  const state = useEffectiveRole();

  if (state.status === "loading") return null;

  if (state.status === "anonymous") {
    return <>{anonymous ?? fallback}</>;
  }

  const ok = allowed
    ? hasAnyRole(state.role, allowed)
    : minRole
      ? hasMinRole(state.role, minRole)
      : true;

  return <>{ok ? children : fallback}</>;
}
