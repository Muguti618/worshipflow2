"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { hasGuestDashboardAllow } from "@/lib/guest-access";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * When Supabase env is missing, enforce sign-in (or guest continue) before the app shell.
 */
export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, hydrated } = useAuthSession();

  useEffect(() => {
    if (isSupabaseConfigured()) return;
    if (!hydrated) return;
    if (!session && !hasGuestDashboardAllow()) router.replace("/");
  }, [hydrated, session, router]);

  if (!isSupabaseConfigured()) {
    if (!hydrated) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
        </div>
      );
    }
    if (!session && !hasGuestDashboardAllow()) return null;
  }

  return <>{children}</>;
}
