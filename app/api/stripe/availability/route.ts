import { NextResponse } from "next/server";
import { getStripePriceIds, isStripeConfigured } from "@/lib/stripe";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Public: whether checkout can run (no secrets exposed). */
export async function GET() {
  const available =
    isSupabaseConfigured() && isStripeConfigured() && Boolean(getStripePriceIds());
  return NextResponse.json({ available });
}
