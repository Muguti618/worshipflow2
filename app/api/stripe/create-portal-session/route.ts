import { NextResponse } from "next/server";
import { appOriginFromRequest } from "@/lib/app-origin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
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

  const portal = await stripe.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: `${origin}/settings`,
  });

  if (!portal.url) {
    return NextResponse.json({ error: "Portal session missing URL." }, { status: 500 });
  }

  return NextResponse.json({ url: portal.url });
}
