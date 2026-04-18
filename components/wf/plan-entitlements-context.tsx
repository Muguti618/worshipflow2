"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { readSlideTransition, writeSlideTransition } from "@/lib/slide-transition";
import { isFreePlanTransition } from "@/lib/plan-limits";
import { isUserIdProAllowlisted } from "@/lib/pro-allowlist";

export type PlanEntitlements = {
  ready: boolean;
  /** Signed in, Stripe billing available, and not Pro — Free caps and branding apply. */
  limitsApply: boolean;
  isPro: boolean;
  billingAvailable: boolean;
  /**
   * False while a signed-in user’s plan is still resolving and Stripe billing is on.
   * Use on the remote page to avoid a short window where Free users see Pro-only UI.
   */
  remotePolicyReady: boolean;
};

const defaultValue: PlanEntitlements = {
  ready: false,
  limitsApply: false,
  isPro: true,
  billingAvailable: false,
  remotePolicyReady: true,
};

const PlanEntitlementsContext = createContext<PlanEntitlements>(defaultValue);

export function PlanEntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { session, hydrated: authHydrated } = useAuthSession();
  const [billingReady, setBillingReady] = useState(false);
  const [billingAvailable, setBillingAvailable] = useState(false);
  const [isPro, setIsPro] = useState(true);

  const refreshBillingPlan = useCallback(async () => {
    if (!authHydrated || !session) return;
    const avRes = await fetch("/api/stripe/availability");
    const av = (await avRes.json().catch(() => ({ available: false }))) as { available?: boolean };
    if (!av.available) {
      setBillingAvailable(false);
      setIsPro(true);
      setBillingReady(true);
      return;
    }
    setBillingAvailable(true);
    const st = await fetch("/api/stripe/billing-status", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (st.status === 401 || !st.ok) {
      // Preserve prior behaviour: do not strand signed-in users on Free when billing fetch fails.
      setIsPro(true);
      setBillingReady(true);
      return;
    }
    const j = (await st.json()) as { isPro?: boolean };
    const apiPro = Boolean(j.isPro);
    setIsPro(apiPro || isUserIdProAllowlisted(session.userId));
    setBillingReady(true);
  }, [authHydrated, session]);

  useEffect(() => {
    if (!authHydrated) return;
    if (!session) {
      setBillingAvailable(false);
      setIsPro(true);
      setBillingReady(true);
      return;
    }
    void refreshBillingPlan();
  }, [session, authHydrated, refreshBillingPlan]);

  useEffect(() => {
    if (!authHydrated || !session) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshBillingPlan();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [authHydrated, session, refreshBillingPlan]);

  const ready = authHydrated && billingReady;
  const limitsApply = Boolean(ready && session && billingAvailable && !isPro);
  const remotePolicyReady = Boolean(!session || !billingAvailable || ready);

  useEffect(() => {
    if (!ready || !limitsApply) return;
    const t = readSlideTransition();
    if (!isFreePlanTransition(t)) writeSlideTransition("fade");
  }, [ready, limitsApply]);

  const value = useMemo<PlanEntitlements>(
    () => ({ ready, limitsApply, isPro, billingAvailable, remotePolicyReady }),
    [ready, limitsApply, isPro, billingAvailable, remotePolicyReady],
  );

  return <PlanEntitlementsContext.Provider value={value}>{children}</PlanEntitlementsContext.Provider>;
}

export function usePlanEntitlements(): PlanEntitlements {
  return useContext(PlanEntitlementsContext);
}
