export type CheckoutPlan = "monthly" | "yearly";

export async function createStripeCheckoutSession(
  plan: CheckoutPlan,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const res = await fetch("/api/stripe/create-checkout-session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });

  const text = await res.text();
  let body: { error?: string; details?: string; url?: string };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return {
      ok: false,
      error: res.ok
        ? "Unexpected response from checkout."
        : `Server error (${res.status}). If you are developing, check the terminal running Next.js for the API route stack trace.`,
    };
  }

  if (!res.ok) {
    const parts = [body.error, body.details].filter((x): x is string => Boolean(x && x.trim()));
    const msg = parts.join(" — ") || `Checkout failed (${res.status}).`;
    return { ok: false, error: msg };
  }

  if (typeof body.url === "string" && body.url.length > 0) {
    return { ok: true, url: body.url };
  }

  return { ok: false, error: "Checkout did not return a redirect URL." };
}
