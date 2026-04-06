import { NextResponse } from "next/server";
import Stripe from "stripe";
import { appOriginFromRequest } from "@/lib/app-origin";
import {
  getStripe,
  getStripePriceIds,
  isStripeConfigured,
  priceIdForPlan,
  stripePriceEnvErrorForId,
  type BillingPlanParam,
} from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isStripeConfigured() || !getStripePriceIds()) {
    return NextResponse.json({ error: "Billing is not configured on this server." }, { status: 503 });
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
    return NextResponse.json({ error: "You must be signed in to upgrade." }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const plan: BillingPlanParam = body.plan === "yearly" ? "yearly" : "monthly";
  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json({ error: "Stripe price IDs are missing." }, { status: 500 });
  }

  const ids = getStripePriceIds()!;
  const monthlyEnvErr = stripePriceEnvErrorForId(ids.monthly, "STRIPE_PRICE_PRO_MONTHLY");
  const yearlyEnvErr = stripePriceEnvErrorForId(ids.yearly, "STRIPE_PRICE_PRO_YEARLY");
  if (monthlyEnvErr) {
    return NextResponse.json({ error: monthlyEnvErr }, { status: 400 });
  }
  if (yearlyEnvErr) {
    return NextResponse.json({ error: yearlyEnvErr }, { status: 400 });
  }

  const origin = appOriginFromRequest(request);

  const { data: billing, error: billingLookupError } = await supabase
    .from("billing_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (billingLookupError) {
    console.error("[checkout] billing_subscriptions lookup", billingLookupError);
    return NextResponse.json(
      {
        error:
          "Could not load billing profile from the database. Apply the Supabase migration that creates billing_subscriptions, or check RLS/policies.",
        details: billingLookupError.message,
      },
      { status: 500 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(billing?.stripe_customer_id
        ? { customer: billing.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/upgrade?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/upgrade?billing=cancel`,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout session missing URL." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[checkout] Stripe checkout.sessions.create", e);
    if (e instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: e.message || "Stripe rejected checkout.",
          details: e.code ? `Stripe code: ${e.code}` : undefined,
        },
        { status: 502 },
      );
    }
    const message = e instanceof Error ? e.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
