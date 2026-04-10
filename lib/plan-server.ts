import { billingSnapshotGrantsPro } from "@/lib/billing-sync";
import { getStripePriceIds, isStripeConfigured } from "@/lib/stripe";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Signed-in users with Stripe prices configured get Free vs Pro enforcement. */
export function billingLimitsEnforcementEnabled(): boolean {
  return isSupabaseConfigured() && isStripeConfigured() && Boolean(getStripePriceIds());
}

export function proRequiredForFeatureResponse(): Response {
  return Response.json(
    {
      error:
        "This feature requires a Pro subscription. Open Upgrade in the app to subscribe, or continue with manual tools on Free.",
      code: "PRO_REQUIRED",
    },
    { status: 403 },
  );
}

function computeIsProFromRow(
  data: { tier?: string; status?: string; stripe_subscription_id?: string | null } | null,
): boolean {
  const forcePro = process.env.WF_FORCE_PRO?.trim().toLowerCase() === "true";
  if (forcePro) return true;
  return billingSnapshotGrantsPro(data);
}

/**
 * When enforcement is off or the user cannot be resolved, returns true (no API block).
 * When enforcement is on: anonymous → false; Free tier → false; Pro → true.
 */
export async function sessionMayUseProAiApis(): Promise<boolean> {
  if (process.env.WF_FORCE_PRO?.trim().toLowerCase() === "true") return true;
  if (!billingLimitsEnforcementEnabled()) return true;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("tier, status, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return true;
  return computeIsProFromRow(data);
}

/**
 * New-song AI slide prep (`/api/ai/song-present`): any signed-in user when Stripe billing is enforced
 * (Free uses it once — enforced in the client). Guests cannot call when enforcement is on.
 */
export async function sessionMayUseSongPresentAi(): Promise<boolean> {
  if (!billingLimitsEnforcementEnabled()) return true;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}
