import { NextResponse, type NextRequest } from "next/server";
import {
  CONCURRENT_IP_WINDOW_MINUTES,
  isValidDeviceFingerprint,
  MAX_TRACKED_DEVICES_PER_USER,
  WF_DEVICE_COOKIE,
} from "@/lib/auth-device";
import { getRequestClientIp } from "@/lib/request-client-ip";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true as const, skipped: true as const });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "auth_unavailable" }, { status: 503 });
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { fingerprint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!isValidDeviceFingerprint(body.fingerprint)) {
    return NextResponse.json({ error: "invalid_fingerprint" }, { status: 400 });
  }

  const fingerprint = body.fingerprint;
  const ip = getRequestClientIp(request);
  const now = new Date().toISOString();

  const { error: upErr } = await supabase.from("user_device_sessions").upsert(
    {
      user_id: user.id,
      fingerprint,
      ip_last: ip,
      last_seen_at: now,
    },
    { onConflict: "user_id,fingerprint" },
  );

  if (upErr) {
    console.warn("[register-device] upsert", upErr);
    return NextResponse.json({ error: "db_upsert" }, { status: 500 });
  }

  const { data: ranked, error: listErr } = await supabase
    .from("user_device_sessions")
    .select("id")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });

  if (listErr || !ranked) {
    return NextResponse.json({ error: "db_list" }, { status: 500 });
  }

  const excess = ranked.slice(MAX_TRACKED_DEVICES_PER_USER);
  if (excess.length > 0) {
    const ids = excess.map((r) => r.id);
    const { error: delErr } = await supabase.from("user_device_sessions").delete().in("id", ids);
    if (delErr) {
      console.warn("[register-device] prune", delErr);
    }
  }

  const since = new Date(
    Date.now() - CONCURRENT_IP_WINDOW_MINUTES * 60_000,
  ).toISOString();
  const { data: recent } = await supabase
    .from("user_device_sessions")
    .select("ip_last")
    .eq("user_id", user.id)
    .gte("last_seen_at", since);

  const ips = new Set(
    (recent ?? [])
      .map((r) => r.ip_last?.trim())
      .filter((x): x is string => Boolean(x && x.length > 0)),
  );
  const concurrentIpWarning = ips.size >= 2;

  const res = NextResponse.json({
    ok: true as const,
    concurrentIpWarning,
    maxDevices: MAX_TRACKED_DEVICES_PER_USER,
  });

  res.cookies.set(WF_DEVICE_COOKIE, fingerprint, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
