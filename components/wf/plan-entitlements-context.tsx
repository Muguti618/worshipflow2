"use client";

import { createContext, useContext, useMemo } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";

export type PlanEntitlements = {
  ready: boolean;
  /** When true, Free-tier caps and branding apply in the UI. */
  limitsApply: boolean;
  isPro: boolean;
  billingAvailable: boolean;
  /**
   * When false, remote UI may wait before applying plan-specific behaviour.
   * Kept true here so there is no “resolving plan” flash.
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

/**
 * Dashboard plan flags for the UI. All signed-in users are treated as Pro (no free limits in the client).
 * Server routes may still enforce billing separately.
 */
export function PlanEntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { session, hydrated: authHydrated } = useAuthSession();

  const value = useMemo<PlanEntitlements>(
    () => ({
      ready: authHydrated,
      limitsApply: false,
      isPro: true,
      billingAvailable: Boolean(session),
      remotePolicyReady: true,
    }),
    [authHydrated, session],
  );

  return <PlanEntitlementsContext.Provider value={value}>{children}</PlanEntitlementsContext.Provider>;
}

export function usePlanEntitlements(): PlanEntitlements {
  return useContext(PlanEntitlementsContext);
}
