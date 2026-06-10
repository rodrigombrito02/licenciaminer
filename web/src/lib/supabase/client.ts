"use client";

/**
 * Cliente Supabase para uso no BROWSER (Client Components).
 *
 * Singleton: criado uma vez por sessao. Use em qualquer Client Component
 * que precise interagir com Supabase Auth ou banco.
 *
 *   const supabase = createBrowserClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */

import { createBrowserClient as createBrowserClientSSR } from "@supabase/ssr";

export function createBrowserClient() {
  return createBrowserClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
