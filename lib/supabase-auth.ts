"use client";

import type { User } from "@supabase/supabase-js";
import type { AuthSession } from "@/lib/auth-local";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export { isSupabaseConfigured };

export function mapSupabaseUserToSession(user: User): AuthSession {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    "";
  const name = fromMeta || user.email?.split("@")[0] || "User";
  return {
    userId: user.id,
    email: user.email ?? "",
    name,
  };
}

export async function supabaseSignIn(email: string, password: string): Promise<{ error: string | null }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return { error: error?.message ?? null };
}

export async function supabaseSignUp(
  name: string,
  email: string,
  password: string,
): Promise<{ error: string | null; needsEmailConfirmation: boolean }> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured.", needsEmailConfirmation: false };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: name.trim(), name: name.trim() },
    },
  });
  if (error) return { error: error.message, needsEmailConfirmation: false };
  if (!data.session && data.user) {
    return {
      error: null,
      needsEmailConfirmation: true,
    };
  }
  return { error: null, needsEmailConfirmation: false };
}

export async function supabaseSignOut(): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
