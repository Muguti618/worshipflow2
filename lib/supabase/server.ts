import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

/** Server Components, Server Actions, Route Handlers — reads/writes auth cookies. */
export async function createServerSupabaseClient() {
  const c = getSupabasePublicConfig();
  if (!c) return null;

  const cookieStore = await cookies();

  return createServerClient(c.url, c.anonKey, {
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
          /* ignore when called from a Server Component that cannot set cookies */
        }
      },
    },
  });
}
