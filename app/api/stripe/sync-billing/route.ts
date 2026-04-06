import { NextResponse } from "next/server";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  subscriptionStatusGrantsPro,
  upsertBillingFromStripeSubscription,
  ensureCustomerLinked,
} from "@/lib/billing-sync";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";

function pickSubscriptionToMirror(subs: Stripe.Subscription[]): Stripe.Subscription | null {
  const scored = subs
    .filter((s) => !["canceled", "unpaid", "incomplete_expired"].includes(s.status))
    .sort((a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0));

  const paying = scored.find((s) => subscriptionStatusGrantsPro(s.status));
  if (paying) return paying;

  if (subs.length === 0) return null;
  return subs.sort((a, b) => b.created - a.created)[0] ?? null;
}

type StripeClient = NonNullable<ReturnType<typeof getStripe>>;

async function syncFromCheckoutSession(
  stripe: StripeClient,
  admin: SupabaseClient,
  user: User,
  sessionId: string,
): Promise<{ ok: true; source: string } | { ok: false; mismatch: boolean }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  if (session.mode !== "subscription") {
    return { ok: false, mismatch: false };
  }
  const ref = session.client_reference_id?.trim();
  const meta = session.metadata?.supabase_user_id?.trim();
  if (ref !== user.id && meta !== user.id) {
    return { ok: false, mismatch: true };
  }
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (customerId) {
    await ensureCustomerLinked(admin, user.id, customerId);
  }
  const subRef = session.subscription;
  let subscription: Stripe.Subscription | null = null;
  if (typeof subRef === "string") {
    subscription = await stripe.subscriptions.retrieve(subRef);
  } else if (subRef && typeof subRef === "object" && "items" in subRef) {
    subscription = subRef as Stripe.Subscription;
  }
  if (subscription) {
    await upsertBillingFromStripeSubscription(admin, subscription, { attributedUserId: user.id });
  }
  return { ok: true, source: "checkout_session" };
}

/**
 * Resolve Stripe customer from billing row or Stripe customers with same email, then mirror subscriptions
 * onto the signed-in user (fixes deleted Supabase accounts where subscription metadata still has old user id).
 */
async function syncFromCustomerForUser(
  stripe: StripeClient,
  admin: SupabaseClient,
  user: User,
): Promise<NextResponse> {
  const email = user.email?.trim();
  if (!email) {
    return NextResponse.json({ ok: false, reason: "no_email", error: "Your account has no email; cannot match Stripe customer." });
  }

  const { data: row } = await admin
    .from("billing_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = row?.stripe_customer_id ?? null;

  if (!customerId) {
    const customers = await stripe.customers.list({ email, limit: 15 });
    const sorted = [...customers.data].sort((a, b) => b.created - a.created);

    for (const c of sorted) {
      const list = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 25 });
      const chosen = pickSubscriptionToMirror(list.data);
      if (chosen) {
        await ensureCustomerLinked(admin, user.id, c.id);
        await upsertBillingFromStripeSubscription(admin, chosen, { attributedUserId: user.id });
        return NextResponse.json({ ok: true, source: "stripe_email_lookup" });
      }
    }

    if (sorted.length > 0) {
      await ensureCustomerLinked(admin, user.id, sorted[0]!.id);
      customerId = sorted[0]!.id;
    }
  }

  if (!customerId) {
    return NextResponse.json({
      ok: false,
      reason: "no_stripe_customer",
      error:
        "No Stripe customer found for your email. Use the same email at Checkout as on this account, or add SUPABASE_SERVICE_ROLE_KEY if sync returns 503.",
    });
  }

  await ensureCustomerLinked(admin, user.id, customerId);

  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 25,
  });

  const chosen = pickSubscriptionToMirror(list.data);
  if (!chosen) {
    return NextResponse.json({
      ok: false,
      reason: "no_subscriptions",
      error: "Stripe has a customer for you but no billable subscription was found.",
    });
  }

  await upsertBillingFromStripeSubscription(admin, chosen, { attributedUserId: user.id });
  return NextResponse.json({ ok: true, source: "customer_list" });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isStripeConfigured()) {
    return NextResponse.json({ error: "Billing sync is not configured." }, { status: 503 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Server missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local and restart — without it, Stripe cannot write to billing_subscriptions.",
      },
      { status: 503 },
    );
  }

  const stripe = getStripe()!;
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  let sessionId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : undefined;
  } catch {
    sessionId = undefined;
  }

  try {
    if (sessionId) {
      const result = await syncFromCheckoutSession(stripe, admin, user, sessionId);
      if (result.ok) {
        return NextResponse.json({ ok: true, source: result.source });
      }
      if (!result.mismatch) {
        return NextResponse.json({ ok: false, error: "Invalid checkout session." }, { status: 400 });
      }
      console.warn("[sync-billing] checkout session user mismatch; using email/customer lookup");
    }

    return await syncFromCustomerForUser(stripe, admin, user);
  } catch (e) {
    console.error("[sync-billing]", e);
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message, ok: false }, { status: 500 });
  }
}
