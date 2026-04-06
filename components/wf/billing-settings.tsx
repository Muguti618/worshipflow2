"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createStripeCheckoutSession, type CheckoutPlan } from "@/lib/stripe-checkout-client";

async function postStripeSync(payload: Record<string, unknown>): Promise<string | null> {
  const res = await fetch("/api/stripe/sync-billing", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (res.status === 503) {
    return typeof j.error === "string"
      ? j.error
      : "Set SUPABASE_SERVICE_ROLE_KEY in .env.local and restart — without it, paid plans cannot be saved to the database.";
  }
  if (res.status === 401) {
    return "You are signed out. Sign in again, then use Refresh from Stripe.";
  }
  if (!res.ok) {
    return typeof j.error === "string" ? j.error : `Sync failed (${res.status}).`;
  }
  if (j.ok === false) {
    return typeof j.error === "string"
      ? j.error
      : "No Stripe subscription found for this login. Use the same email at Checkout as on this account, or open Refresh from Stripe after fixing env.";
  }
  return null;
}

type BillingStatus = {
  tier: string;
  status: string;
  isPro: boolean;
  hasStripeCustomer: boolean;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
};

function tierLabel(tier: string, isPro: boolean): string {
  if (tier === "pro_yearly") return "Pro — yearly";
  if (tier === "pro_monthly") return "Pro — monthly";
  if (isPro) return "Pro";
  return "Free";
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

type BillingSettingsInnerProps = {
  autoStartPlan?: CheckoutPlan | null;
};

function BillingSettingsInner({ autoStartPlan = null }: BillingSettingsInnerProps) {
  const searchParams = useSearchParams();
  const billingFlash = searchParams.get("billing");

  const [checkoutLoading, setCheckoutLoading] = useState<null | CheckoutPlan>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const autoStartAttempted = useRef(false);
  const checkoutSuccessSynced = useRef(false);

  const loadStatus = useCallback(async () => {
    setStatusError(null);
    const res = await fetch("/api/stripe/billing-status", { credentials: "same-origin" });
    if (res.status === 401) {
      setStatus(null);
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setStatusError(typeof j.error === "string" ? j.error : "Could not load billing status.");
      return;
    }
    const j = (await res.json()) as BillingStatus;
    setStatus(j);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/stripe/availability");
      const j = await res.json().catch(() => ({ available: false }));
      if (!cancelled) setAvailability(Boolean(j.available));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (availability) void loadStatus();
  }, [availability, loadStatus]);

  useEffect(() => {
    if (!availability || billingFlash !== "success" || checkoutSuccessSynced.current) return;
    checkoutSuccessSynced.current = true;
    const sessionId = searchParams.get("session_id");
    void (async () => {
      setActionError(null);
      const errMsg = await postStripeSync({ sessionId: sessionId || undefined });
      if (errMsg) setActionError(errMsg);
      await loadStatus();
    })();
  }, [availability, billingFlash, loadStatus, searchParams]);

  const startCheckout = useCallback(async (plan: CheckoutPlan) => {
    setActionError(null);
    setCheckoutLoading(plan);
    try {
      const r = await createStripeCheckoutSession(plan);
      if (r.ok) {
        window.location.href = r.url;
        return;
      }
      setActionError(r.error);
    } finally {
      setCheckoutLoading(null);
    }
  }, []);

  useEffect(() => {
    if (!autoStartPlan || !availability || !status || status.isPro) return;
    if (autoStartAttempted.current) return;
    autoStartAttempted.current = true;
    void (async () => {
      setActionError(null);
      setCheckoutLoading(autoStartPlan);
      const r = await createStripeCheckoutSession(autoStartPlan);
      setCheckoutLoading(null);
      if (r.ok) {
        window.location.href = r.url;
        return;
      }
      autoStartAttempted.current = false;
      setActionError(r.error);
    })();
  }, [autoStartPlan, availability, status]);

  const refreshFromStripe = useCallback(async () => {
    setActionError(null);
    const errMsg = await postStripeSync({});
    if (errMsg) setActionError(errMsg);
    await loadStatus();
  }, [loadStatus]);

  const openPortal = async () => {
    setActionError(null);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        credentials: "same-origin",
      });
      const text = await res.text();
      let j: { error?: string; url?: string };
      try {
        j = JSON.parse(text) as typeof j;
      } catch {
        setActionError(`Portal failed (${res.status}).`);
        return;
      }
      if (!res.ok) {
        setActionError(typeof j.error === "string" ? j.error : "Could not open billing portal.");
        return;
      }
      if (typeof j.url === "string") {
        window.location.href = j.url;
        return;
      }
      setActionError("Portal did not return a URL.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (availability === false) {
    return (
      <section className="rounded-[18px] border border-wf-border bg-wf-card/40 p-6 backdrop-blur-md">
        <h2 className="text-sm font-semibold text-wf-text">Plan &amp; billing</h2>
        <p className="mt-2 text-xs leading-relaxed text-wf-muted">
          Upgrades are not enabled on this server (Stripe or Supabase billing env is missing).
        </p>
      </section>
    );
  }

  if (availability === null) {
    return (
      <section className="rounded-[18px] border border-wf-border bg-wf-card/40 p-6 backdrop-blur-md">
        <h2 className="text-sm font-semibold text-wf-text">Plan &amp; billing</h2>
        <p className="mt-2 text-xs text-wf-muted">Loading…</p>
      </section>
    );
  }

  return (
    <section className="rounded-[18px] border border-wf-border bg-wf-card/40 p-6 backdrop-blur-md">
      <h2 className="text-sm font-semibold text-wf-text">Plan &amp; billing</h2>
      {status?.isPro ? (
        <p className="mt-1 text-xs leading-relaxed text-wf-muted">
          You have an active Pro subscription. Use billing portal to change card, plan, or cancel. Upgrade options
          stay hidden until the subscription ends.
        </p>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-wf-muted">
          Sign in to upgrade. Checkout is powered by Stripe; your card is not stored in this app.
        </p>
      )}

      {autoStartPlan && status && !status.isPro && (
        <p className="mt-2 text-xs text-violet-200/85">
          Starting secure checkout for your{" "}
          {autoStartPlan === "yearly" ? "yearly" : "monthly"} plan… If nothing happens, use the buttons below.
        </p>
      )}

      {billingFlash === "success" && (
        <p className="mt-3 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200/90">
          {status?.isPro
            ? "Payment received — your account is on Pro."
            : "Payment completed. Syncing with Stripe… If you still see Free, use Refresh from Stripe below."}
        </p>
      )}
      {billingFlash === "cancel" && (
        <p className="mt-3 rounded-[10px] border border-wf-border bg-wf-bg/50 px-3 py-2 text-xs text-wf-muted">
          Checkout was cancelled. No charge was made.
        </p>
      )}

      {!status && !statusError && (
        <p className="mt-4 text-sm text-wf-muted">
          You need an account to see your plan.{" "}
          <Link href="/login" className="font-medium text-violet-500 underline-offset-2 hover:underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="font-medium text-violet-500 underline-offset-2 hover:underline">
            create one
          </Link>
          , then return here to upgrade.
        </p>
      )}

      {statusError && (
        <p className="mt-3 text-xs text-red-400/90" role="alert">
          {statusError}
        </p>
      )}

      {status && (
        <div className="mt-4 space-y-3 text-sm text-wf-text">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-wf-muted">Current plan</span>
            <span
              className={`font-medium ${!status.isPro ? "rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-100 ring-1 ring-amber-500/35" : ""}`}
            >
              {tierLabel(status.tier, status.isPro)}
              {!status.isPro && (
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
                  upgrade available
                </span>
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-wf-muted">Subscription status</span>
            <span className="font-mono text-xs text-wf-text/90">{status.status}</span>
          </div>
          {status.isPro && formatDate(status.current_period_end) && (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-wf-muted">Renews / period ends</span>
              <span>{formatDate(status.current_period_end)}</span>
            </div>
          )}
          {formatDate(status.trial_end) && (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-wf-muted">Trial ends</span>
              <span>{formatDate(status.trial_end)}</span>
            </div>
          )}
          {status.cancel_at_period_end && (
            <p className="text-xs text-amber-200/80">
              Your subscription is set to cancel at the end of the current period.
            </p>
          )}
        </div>
      )}

      {actionError && (
        <p className="mt-3 text-xs text-red-400/90" role="alert">
          {actionError}
        </p>
      )}

      {status && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {!status.isPro && (
            <>
              <button
                type="button"
                disabled={checkoutLoading !== null}
                onClick={() => void startCheckout("monthly")}
                className="rounded-[12px] bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {checkoutLoading === "monthly" ? "Redirecting…" : "Upgrade — monthly"}
              </button>
              <button
                type="button"
                disabled={checkoutLoading !== null}
                onClick={() => void startCheckout("yearly")}
                className="rounded-[12px] border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
              >
                {checkoutLoading === "yearly" ? "Redirecting…" : "Upgrade — yearly"}
              </button>
            </>
          )}
          {status.hasStripeCustomer ? (
            <button
              type="button"
              disabled={portalLoading || checkoutLoading !== null}
              onClick={() => void openPortal()}
              className="rounded-[12px] border border-wf-border bg-wf-bg/50 px-4 py-2.5 text-sm font-medium text-wf-text transition hover:bg-wf-bg disabled:opacity-50"
            >
              {portalLoading ? "Opening…" : "Manage billing"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void refreshFromStripe()}
            className="rounded-[12px] border border-wf-border bg-transparent px-4 py-2.5 text-sm font-medium text-wf-muted transition hover:text-wf-text"
          >
            Refresh from Stripe
          </button>
        </div>
      )}
    </section>
  );
}

type BillingSettingsProps = {
  autoStartPlan?: CheckoutPlan | null;
};

export function BillingSettings({ autoStartPlan = null }: BillingSettingsProps) {
  return (
    <Suspense
      fallback={
        <section className="rounded-[18px] border border-wf-border bg-wf-card/40 p-6 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-wf-text">Plan &amp; billing</h2>
          <p className="mt-2 text-xs text-wf-muted">Loading…</p>
        </section>
      }
    >
      <BillingSettingsInner autoStartPlan={autoStartPlan} />
    </Suspense>
  );
}
