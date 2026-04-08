import { NextResponse } from "next/server";
import Stripe from "stripe";
import { appOriginFromRequest } from "@/lib/app-origin";
import { getStripe, isStripeConfigured, isStripeMissingCustomerError } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isStripeConfigured()) {
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
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: billing } = await supabase
    .from("billing_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!billing?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer on file. Start a subscription from Upgrade first." },
      { status: 400 },
    );
  }

  const origin = appOriginFromRequest(request);

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${origin}/settings`,
    });

    if (!portal.url) {
      return NextResponse.json({ error: "Portal session missing URL." }, { status: 500 });
    }

    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error("[portal] billingPortal.sessions.create", e);
    if (isStripeMissingCustomerError(e)) {
      return NextResponse.json(
        {
          error:
            "This account is linked to a Stripe customer that no longer exists (for example test vs live keys or a deleted customer). Use “Refresh from Stripe” below to relink, then try Manage billing again.",
          code: "stale_customer",
        },
        { status: 409 },
      );
    }
    if (e instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: e.message || "Stripe could not open the billing portal.", code: e.code },
        { status: 502 },
      );
    }
    const message = e instanceof Error ? e.message : "Portal failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
