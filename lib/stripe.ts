import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripePriceIds(): { monthly: string; yearly: string } | null {
  const monthly = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
  const yearly = process.env.STRIPE_PRICE_PRO_YEARLY?.trim();
  if (!monthly || !yearly) return null;
  return { monthly, yearly };
}

export type BillingPlanParam = "monthly" | "yearly";

export function priceIdForPlan(plan: BillingPlanParam): string | null {
  const ids = getStripePriceIds();
  if (!ids) return null;
  return plan === "yearly" ? ids.yearly : ids.monthly;
}

/** Stripe Checkout line items need Price IDs (`price_...`), not Product IDs (`prod_...`). */
/** True when Stripe reports the customer id does not exist (wrong account, deleted customer, test vs live mismatch). */
export function isStripeMissingCustomerError(e: unknown): boolean {
  if (!(e instanceof Stripe.errors.StripeInvalidRequestError)) return false;
  if (e.code !== "resource_missing") return false;
  if (e.param === "customer") return true;
  return typeof e.message === "string" && e.message.toLowerCase().includes("no such customer");
}

export function stripePriceEnvErrorForId(id: string, envName: string): string | null {
  const t = id.trim();
  if (t.startsWith("prod_")) {
    return `${envName} is set to a Product ID (${t.slice(0, 12)}…). Open Stripe → Product catalog → your product → Pricing and copy the Price ID (starts with price_) for that recurring price.`;
  }
  if (!t.startsWith("price_")) {
    return `${envName} should be a Stripe Price ID (starts with price_). You have: ${t.slice(0, 16)}${t.length > 16 ? "…" : ""}`;
  }
  return null;
}
