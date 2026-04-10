import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripePriceIds } from "@/lib/stripe";

export type BillingTier = "free" | "pro_monthly" | "pro_yearly";

export function tierFromStripePriceId(priceId: string | undefined | null): BillingTier {
  if (!priceId) return "free";
  const ids = getStripePriceIds();
  if (!ids) return "free";
  if (priceId === ids.yearly) return "pro_yearly";
  if (priceId === ids.monthly) return "pro_monthly";
  return "free";
}

/** Pro features while subscription is in good standing (includes short past_due grace). */
export function subscriptionStatusGrantsPro(status: string): boolean {
  const s = String(status ?? "").trim().toLowerCase();
  return s === "trialing" || s === "active" || s === "past_due";
}

type BillingRowLike = {
  tier?: string | null;
  status?: string | null;
  stripe_subscription_id?: string | null;
};

/**
 * Whether the mirrored `billing_subscriptions` row should unlock Pro in the app.
 * Supports manual / comped rows: Pro tier + `status = none` (no Stripe subscription id yet).
 */
export function billingSnapshotGrantsPro(data: BillingRowLike | null | undefined): boolean {
  if (!data) return false;
  const tier = String(data.tier ?? "free").trim().toLowerCase();
  const status = String(data.status ?? "none").trim().toLowerCase();
  const tierIsPro = tier === "pro_monthly" || tier === "pro_yearly";
  const hasActiveSubRow = Boolean(String(data.stripe_subscription_id ?? "").trim());
  const statusGrants = subscriptionStatusGrantsPro(status);

  if (tierIsPro && status === "none") return true;

  return statusGrants && (tierIsPro || hasActiveSubRow);
}

function firstSubscriptionPriceId(sub: Stripe.Subscription): string | null {
  const item = sub.items.data[0];
  if (!item?.price) return null;
  return typeof item.price === "string" ? item.price : item.price.id;
}

export type UpsertBillingOptions = {
  /** When set (e.g. sync for signed-in user), row is written for this user even if subscription metadata points at another Supabase id (deleted account / test churn). */
  attributedUserId?: string;
};

export async function upsertBillingFromStripeSubscription(
  admin: SupabaseClient,
  sub: Stripe.Subscription,
  options?: UpsertBillingOptions,
): Promise<void> {
  const priceId = firstSubscriptionPriceId(sub);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  let userId = options?.attributedUserId?.trim() || null;
  if (!userId) {
    userId = sub.metadata?.supabase_user_id?.trim() || null;
  }
  if (!userId && customerId) {
    const { data } = await admin
      .from("billing_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    console.warn("[billing] Stripe subscription without supabase_user_id metadata:", sub.id);
    return;
  }

  const status = sub.status;
  const ended =
    status === "canceled" || status === "unpaid" || status === "incomplete_expired";
  const grants = !ended && subscriptionStatusGrantsPro(status);
  const mappedTier = tierFromStripePriceId(priceId);
  /** Paid sub with a price not listed in env still counts as Pro in the app. */
  const tier: BillingTier = grants ? (mappedTier !== "free" ? mappedTier : "pro_monthly") : "free";

  const payload = {
    user_id: userId,
    tier,
    stripe_customer_id: customerId,
    stripe_subscription_id: ended ? null : sub.id,
    stripe_price_id: ended ? null : priceId,
    status: ended ? "canceled" : status,
    current_period_end:
      !ended && sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    trial_end:
      !ended && sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: ended ? false : (sub.cancel_at_period_end ?? false),
  };

  const { error } = await admin.from("billing_subscriptions").upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("[billing] upsert failed", error);
    throw error;
  }
}

/** Ensure a row exists and store Stripe customer id after checkout. */
export async function ensureCustomerLinked(
  admin: SupabaseClient,
  userId: string,
  customerId: string,
): Promise<void> {
  const { data } = await admin
    .from("billing_subscriptions")
    .select("user_id, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    await admin.from("billing_subscriptions").insert({
      user_id: userId,
      tier: "free",
      status: "none",
      stripe_customer_id: customerId,
    });
    return;
  }

  if (!data.stripe_customer_id) {
    await admin.from("billing_subscriptions").update({ stripe_customer_id: customerId }).eq("user_id", userId);
  }
}
