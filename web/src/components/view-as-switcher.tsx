"use client";

/**
 * Seletor "Ver como" — visível apenas para consultor/admin (papel REAL).
 * Admin pode simular todos os níveis; consultor todos exceto admin.
 */

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/hooks/use-role";
import { useViewAs, type ViewAsMode } from "@/lib/view-as";
import { hasMinRole } from "@/lib/roles";

const MODES: { value: ViewAsMode; label: string }[] = [
  { value: null, label: "Meu acesso real" },
  { value: "admin", label: "Administrador" },
  { value: "consultor", label: "Consultor Summo" },
  { value: "visitante_pago", label: "Visitante Premium" },
  { value: "visitante_free", label: "Visitante (logado)" },
  { value: "anonymous", label: "Visitante (sem login)" },
];

export function ViewAsSwitcher() {
  const real = useRole();
  const { viewAs, setViewAs } = useViewAs();

  // Só consultor/admin (papel real) enxergam o seletor
  if (real.status !== "authenticated" || !hasMinRole(real.role, "consultor")) {
    return null;
  }

  const isAdmin = real.role === "admin";
  const options = MODES.filter((m) => isAdmin || m.value !== "admin");
  const current = MODES.find((m) => m.value === viewAs) ?? MODES[0];
  const previewing = viewAs !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-1.5 px-2 ${
            previewing
              ? "bg-brand-gold/15 text-brand-gold hover:bg-brand-gold/25"
              : "hover:bg-muted"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">
            {previewing ? `Vendo como: ${current.label}` : "Ver como"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">
          Pré-visualizar acesso
          <div className="font-normal text-muted-foreground">
            Apenas visual — não altera seu login.
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((m) => (
          <DropdownMenuItem
            key={String(m.value)}
            onClick={() => setViewAs(m.value)}
            className={`text-xs ${viewAs === m.value ? "font-semibold text-brand-teal" : ""}`}
          >
            {m.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
