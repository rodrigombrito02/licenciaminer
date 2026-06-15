"use client";

/**
 * "Ver como" — permite que consultor/admin pré-visualizem o sistema sob a ótica
 * de outro nível de acesso (visitante anônimo, logado, premium, consultor, admin).
 *
 * Override APENAS de UI (client-side): não altera autenticação real nem o que o
 * middleware/servidor liberam. Serve para validar a matriz de visibilidade.
 *
 * Regras de quem pode simular o quê são aplicadas em useEffectiveRole.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "@/lib/roles";

export type ViewAsMode = Role | "anonymous" | null; // null = papel real

interface ViewAsContextValue {
  viewAs: ViewAsMode;
  setViewAs: (mode: ViewAsMode) => void;
}

const ViewAsContext = createContext<ViewAsContextValue>({
  viewAs: null,
  setViewAs: () => {},
});

const STORAGE_KEY = "summo_view_as";

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAs, setViewAsState] = useState<ViewAsMode>(null);

  // Hidrata de sessionStorage (reseta ao fechar a aba — evita ficar "preso")
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setViewAsState(JSON.parse(raw) as ViewAsMode);
    } catch {
      /* ignore */
    }
  }, []);

  const setViewAs = useCallback((mode: ViewAsMode) => {
    setViewAsState(mode);
    try {
      if (mode) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ViewAsContext.Provider value={{ viewAs, setViewAs }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs(): ViewAsContextValue {
  return useContext(ViewAsContext);
}
