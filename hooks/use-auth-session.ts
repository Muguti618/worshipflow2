"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  WF_AUTH_CHANGE_EVENT,
  clearSession,
  readSession,
  type AuthSession,
} from "@/lib/auth-local";
import { clearGuestDashboardAllow } from "@/lib/guest-access";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { withTimeout } from "@/lib/async-timeout";
import { mapSupabaseUserToSession, supabaseSignOut } from "@/lib/supabase-auth";

/** LAN / slow networks: Supabase `getSession` must not block the UI forever. */
const SUPABASE_SESSION_TIMEOUT_MS = 12_000;

export function useAuthSession(): {
  session: AuthSession | null;
  hydrated: boolean;
  logout: () => void | Promise<void>;
} {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const syncLocal = useCallback(() => {
    setSession(readSession());
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setHydrated(true);
        return;
      }
      let cancelled = false;
      const applyUser = (user: User | null) => {
        if (cancelled) return;
        setSession(user ? mapSupabaseUserToSession(user) : null);
        setHydrated(true);
      };
      void (async () => {
        try {
          const { data } = await withTimeout(supabase.auth.getSession(), SUPABASE_SESSION_TIMEOUT_MS);
          applyUser(data.session?.user ?? null);
        } catch {
          applyUser(null);
        }
      })();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, s) => {
        applyUser(s?.user ?? null);
      });
      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    }

    syncLocal();
    setHydrated(true);
    window.addEventListener(WF_AUTH_CHANGE_EVENT, syncLocal);
    window.addEventListener("storage", syncLocal);
    return () => {
      window.removeEventListener(WF_AUTH_CHANGE_EVENT, syncLocal);
      window.removeEventListener("storage", syncLocal);
    };
  }, [syncLocal]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await supabaseSignOut();
    }
    clearGuestDashboardAllow();
    clearSession();
    setSession(null);
    if (typeof window !== "undefined") {
      window.location.assign("/");
      return;
    }
    router.replace("/");
  }, [router]);

  return { session, hydrated, logout };
}
