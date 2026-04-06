import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/register" || pathname === "/login") return true;
  if (pathname === "/terms" || pathname === "/privacy") return true;
  if (pathname === "/api/stripe/webhook") return true;
  if (pathname === "/sw.js") return true;
  if (pathname.startsWith("/present")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  return false;
}

function copyCookies(from: NextResponse, to: NextResponse): void {
  try {
    from.cookies.getAll().forEach(({ name, value }) => {
      to.cookies.set(name, value);
    });
  } catch {
    /* ignore */
  }
}

/**
 * Refreshes the Supabase session and enforces auth for app routes when configured.
 */
export async function updateSession(request: NextRequest) {
  const c = getSupabasePublicConfig();
  const pathname = request.nextUrl.pathname;

  if (!c) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(c.url, c.anonKey, {
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
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    const redir = NextResponse.redirect(new URL("/", request.url));
    copyCookies(supabaseResponse, redir);
    return redir;
  }

  if (user && (pathname === "/" || pathname === "/login")) {
    const redir = NextResponse.redirect(new URL("/dashboard", request.url));
    copyCookies(supabaseResponse, redir);
    return redir;
  }

  return supabaseResponse;
}
