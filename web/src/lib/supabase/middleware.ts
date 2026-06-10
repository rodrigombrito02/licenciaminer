/**
 * Helper de middleware: refresca a sessao Supabase em cada request e
 * protege rotas autenticadas (/(dashboard)/*).
 *
 * Roteamento:
 *   - Usuario nao autenticado → redireciona para /login
 *   - Usuario autenticado em /login → redireciona para /
 *   - /login e /auth/* sao sempre publicos
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/auth", "/_next", "/api/auth"];
const PUBLIC_FILE_EXTS = [".ico", ".png", ".jpg", ".svg", ".webp", ".css", ".js"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  if (PUBLIC_FILE_EXTS.some((ext) => pathname.endsWith(ext))) {
    return true;
  }
  return false;
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

  // Usuario nao autenticado tentando acessar rota protegida → vai pra /login
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Usuario autenticado tentando acessar /login → vai pra home
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.searchParams.get("redirect") || "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
