"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type AuthAntiAbuseValue = {
  concurrentIpWarning: boolean;
  setConcurrentIpWarning: (value: boolean) => void;
  dismissConcurrentIpWarning: () => void;
  dismissedConcurrentIp: boolean;
};

export const AuthAntiAbuseContext = createContext<AuthAntiAbuseValue | null>(null);

const DISMISS_KEY = "wf_dismiss_concurrent_ip";

export function AuthAntiAbuseProvider({ children }: { children: React.ReactNode }) {
  const [concurrentIpWarning, setConcurrentIpWarning] = useState(false);
  const [dismissedConcurrentIp, setDismissedConcurrentIp] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const dismissConcurrentIpWarning = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissedConcurrentIp(true);
    setConcurrentIpWarning(false);
  }, []);

  const value = useMemo(
    () => ({
      concurrentIpWarning,
      setConcurrentIpWarning,
      dismissConcurrentIpWarning,
      dismissedConcurrentIp,
    }),
    [concurrentIpWarning, dismissConcurrentIpWarning, dismissedConcurrentIp],
  );

  return <AuthAntiAbuseContext.Provider value={value}>{children}</AuthAntiAbuseContext.Provider>;
}

export function useAuthAntiAbuse(): AuthAntiAbuseValue {
  const ctx = useContext(AuthAntiAbuseContext);
  if (!ctx) {
    throw new Error("useAuthAntiAbuse must be used within AuthAntiAbuseProvider");
  }
  return ctx;
}

export function useOptionalAuthAntiAbuse(): AuthAntiAbuseValue | null {
  return useContext(AuthAntiAbuseContext);
}
