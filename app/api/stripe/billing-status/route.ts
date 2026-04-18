import { NextResponse } from "next/server";
import { billingSnapshotGrantsPro } from "@/lib/billing-sync";
import { isUserIdProAllowlisted } from "@/lib/pro-allowlist";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }

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

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select(
      "tier, status, stripe_customer_id, stripe_subscription_id, current_period_end, trial_end, cancel_at_period_end",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tier = (data?.tier as string) ?? "free";
  const status = (data?.status as string) ?? "none";
  /** Pro = Stripe in good standing, comped row, or WF_PRO_USER_IDS allowlist. */
  const isPro =
    billingSnapshotGrantsPro(data ?? null) || isUserIdProAllowlisted(user.id);

  return NextResponse.json(
    {
      tier,
      status,
      isPro,
      hasStripeCustomer: Boolean(data?.stripe_customer_id),
      current_period_end: data?.current_period_end ?? null,
      trial_end: data?.trial_end ?? null,
      cancel_at_period_end: data?.cancel_at_period_end ?? false,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
