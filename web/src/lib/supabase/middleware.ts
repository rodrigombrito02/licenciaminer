/**
 * Middleware Supabase: refresca sessao + protege rotas conforme role.
 *
 * Comportamento:
 *   - Rotas PUBLIC: passa direto, sem checar login
 *   - Rotas PAGO/CONSULTOR/ADMIN: precisa login (redireciona pra /login)
 *   - Se logado mas role insuficiente: redireciona pra / (home) com flag
 *   - Usuario logado em /login: redireciona pra home
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  hasMinRole,
  requiredRoleForPath,
  type Role,
  type UserMetadata,
} from "@/lib/roles";

const PUBLIC_FILE_EXTS = [".ico", ".png", ".jpg", ".svg", ".webp", ".css", ".js"];

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/auth/")) return true;
  return PUBLIC_FILE_EXTS.some((ext) => pathname.endsWith(ext));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Static assets passam livres
  if (isStaticAsset(pathname)) return supabaseResponse;

  const required = requiredRoleForPath(pathname);

  // 1. Rota publica — passa sempre (mesmo nao logado)
  if (required === "public") {
    // Se ja logado e indo pra /login, redireciona pra home
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = request.nextUrl.searchParams.get("redirect") || "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // 2. Rota protegida e nao logado — vai pra /login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 3. Logado — verifica role
  const meta = (user.user_metadata as UserMetadata) || {};
  const role: Role = meta.role || "visitante_free";

  if (!hasMinRole(role, required)) {
    // Role insuficiente — manda pra home com flag
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("acesso_negado", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
