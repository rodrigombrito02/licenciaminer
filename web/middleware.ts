import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, logo.png, robots.txt etc
     * - assets em /public
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.*\\.(?:png|svg)|.*\\.(?:svg|png|jpg|jpeg|webp|ico|css|js)).*)",
  ],
};
