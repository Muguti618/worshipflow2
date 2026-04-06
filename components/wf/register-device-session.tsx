"use client";

import { useEffect, useRef } from "react";
import { useOptionalAuthAntiAbuse } from "@/components/wf/auth-anti-abuse-context";
import { useAuthSession } from "@/hooks/use-auth-session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const FALLBACK_PREFIX = "wf_fb_";

function getOrCreateFallbackFingerprint(): string {
  try {
    const k = "wf_device_fallback_id";
    let v = window.localStorage.getItem(k);
    if (!v || v.length < 12) {
      v = `${FALLBACK_PREFIX}${crypto.randomUUID().replace(/-/g, "")}`;
      window.localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return `${FALLBACK_PREFIX}anon`;
  }
}

/**
 * Registers a stable browser fingerprint + prunes to two devices per account.
 * Sets httpOnly cookie for future server checks; surfaces concurrent-IP warning in dashboard.
 */
export function RegisterDeviceSession() {
  const { session, hydrated } = useAuthSession();
  const anti = useOptionalAuthAntiAbuse();
  const antiRef = useRef(anti);
  antiRef.current = anti;
  const ranForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!session?.userId) {
      ranForUser.current = null;
      return;
    }
    if (!isSupabaseConfigured()) return;
    if (ranForUser.current === session.userId) return;
    ranForUser.current = session.userId;

    let cancelled = false;

    (async () => {
      let fingerprint: string;
      try {
        const mod = await import("@fingerprintjs/fingerprintjs");
        const FingerprintJS = mod.default;
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        fingerprint = result.visitorId;
      } catch {
        fingerprint = getOrCreateFallbackFingerprint();
      }

      if (cancelled) return;

      try {
        const res = await fetch("/api/auth/register-device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ fingerprint }),
        });
        if (!res.ok) return;
        const j = (await res.json()) as { concurrentIpWarning?: boolean };
        if (j.concurrentIpWarning) {
          antiRef.current?.setConcurrentIpWarning(true);
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, session?.userId]);

  return null;
}
