/**
 * Cliente Supabase para uso em SERVER Components, Server Actions e Route Handlers.
 *
 * Cuida da sincronizacao de cookies entre request/response para que a sessao
 * seja preservada corretamente em SSR.
 *
 *   const supabase = await createServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */

import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // Pode acontecer em Server Components — sessao é refrescada via middleware.
          }
        },
      },
    },
  );
}
