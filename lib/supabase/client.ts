"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

/** Browser Supabase client; returns null if env is not set (use local auth fallback). */
export function createBrowserSupabaseClient() {
  const c = getSupabasePublicConfig();
  if (!c) return null;
  return createBrowserClient(c.url, c.anonKey);
}
