"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createBrowserClient } from "@/lib/supabase/client";

export function UserMenu() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setEmail(user?.email ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Antes de carregar quem está logado — não mostra nada (evita flash)
  if (email === null) return null;

  // Inicial para o avatar
  const initial = email.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2 hover:bg-muted"
        >
          <div className="w-6 h-6 rounded-full bg-brand-teal text-white flex items-center justify-center font-bold text-xs">
            {initial}
          </div>
          <span className="hidden sm:inline text-xs font-medium truncate max-w-[140px]">
            {email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">
          <div className="font-bold">Conectado</div>
          <div className="text-muted-foreground font-normal truncate">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon className="h-3.5 w-3.5 mr-2" />
          <span className="text-xs">Perfil (em breve)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-destructive focus:text-destructive"
        >
          {signingOut ? (
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5 mr-2" />
          )}
          <span className="text-xs">Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
