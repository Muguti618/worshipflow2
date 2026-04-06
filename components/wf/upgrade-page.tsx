"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BillingSettings } from "@/components/wf/billing-settings";
import type { CheckoutPlan } from "@/lib/stripe-checkout-client";

function UpgradePageBody() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("checkout");
  const autoStartPlan: CheckoutPlan | null =
    raw === "yearly" ? "yearly" : raw === "monthly" ? "monthly" : null;

  const [isPro, setIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/stripe/billing-status", { credentials: "same-origin" });
      if (cancelled) return;
      if (res.status === 401) {
        setIsPro(false);
        return;
      }
      if (!res.ok) {
        setIsPro(false);
        return;
      }
      const j = (await res.json()) as { isPro?: boolean };
      setIsPro(Boolean(j.isPro));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-8">
      {isPro ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-wf-text">You&apos;re on Pro</h1>
          <p className="mt-1 text-sm text-wf-muted">
            Upgrade checkout is hidden while your subscription is active. When it ends or is canceled, you can
            subscribe again here. Manage payment method and invoices below or in{" "}
            <Link href="/settings" className="font-medium text-violet-500 underline-offset-2 hover:underline">
              Settings
            </Link>
            .
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-wf-text">Upgrade</h1>
          <p className="mt-1 text-sm text-wf-muted">
            Choose Pro monthly or yearly. You&apos;ll complete payment on Stripe Checkout, then return here.
            Billing is also under{" "}
            <Link href="/settings" className="font-medium text-violet-500 underline-offset-2 hover:underline">
              Settings
            </Link>
            .
          </p>
        </>
      )}
      <div className="mt-8">
        <BillingSettings autoStartPlan={isPro === false ? autoStartPlan : null} />
      </div>
    </div>
  );
}

export function UpgradePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl p-6 lg:p-8">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-wf-text/[0.08]" />
          <div className="mt-4 h-24 animate-pulse rounded-[18px] bg-wf-text/[0.06]" />
        </div>
      }
    >
      <UpgradePageBody />
    </Suspense>
  );
}
