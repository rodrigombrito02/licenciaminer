/**
 * Callback de auth do Supabase — recebe o `code` do link de reset/confirm
 * e troca por uma sessao, redirecionando depois para /login com flag de
 * reset (ou pra home se ja autenticado).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Sem code ou erro — volta pra login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
