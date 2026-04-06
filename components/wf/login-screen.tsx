"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loginWithPassword } from "@/lib/auth-local";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { clearGuestDashboardAllow, setGuestDashboardAllow } from "@/lib/guest-access";
import { isSupabaseConfigured, supabaseSignIn } from "@/lib/supabase-auth";

export function LoginScreen(props: { showGuestContinue?: boolean }) {
  const { showGuestContinue = false } = props;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/dashboard");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("next");
    setRedirectTo(safeInternalPath(q, "/dashboard"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabaseSignIn(email, password);
        if (error) {
          setError(error);
          return;
        }
      } else {
        const r = await loginWithPassword(email, password);
        if (!r.ok) {
          setError(r.error);
          return;
        }
      }
      const next = safeInternalPath(
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null,
        "/dashboard",
      );
      router.push(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] rounded-[20px] border border-wf-border bg-wf-card/85 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] text-xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(139,92,246,0.4), rgba(236,72,153,0.3))",
          }}
        >
          🎛️
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-wf-text">Welcome back</h1>
        <p className="mt-2 text-sm text-wf-muted">Sign in to LumenWorship</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="wf-login-email" className="mb-1.5 block text-xs font-medium text-wf-muted">
            Email
          </label>
          <input
            id="wf-login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 w-full rounded-[12px] border border-wf-input-border bg-wf-bg/80 px-3.5 text-sm text-wf-text outline-none transition focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/20"
            placeholder="you@church.org"
          />
        </div>
        <div>
          <label htmlFor="wf-login-password" className="mb-1.5 block text-xs font-medium text-wf-muted">
            Password
          </label>
          <input
            id="wf-login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 w-full rounded-[12px] border border-wf-input-border bg-wf-bg/80 px-3.5 text-sm text-wf-text outline-none transition focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/20"
            placeholder="••••••••"
          />
        </div>
        {error ? (
          <p className="rounded-[10px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200/90">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-[12px] bg-gradient-to-r from-blue-600/95 via-violet-600/95 to-fuchsia-600/85 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-wf-muted">
        No account yet?{" "}
        <Link
          href={
            redirectTo === "/dashboard"
              ? "/register"
              : `/register?next=${encodeURIComponent(redirectTo)}`
          }
          className="font-semibold text-violet-300 hover:underline"
        >
          Create one
        </Link>
      </p>
      {showGuestContinue ? (
        <p className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setGuestDashboardAllow();
              router.push("/dashboard");
            }}
            className="text-xs text-wf-muted hover:text-wf-text hover:underline"
          >
            Continue without signing in →
          </button>
        </p>
      ) : null}
      <p className="mt-6 border-t border-wf-border pt-4 text-[10px] leading-relaxed text-wf-muted/90">
        {isSupabaseConfigured()
          ? "Signed in with Supabase Auth (session in secure cookies)."
          : "Demo sign-in stores a session in this browser only. Add Supabase env vars for cloud auth."}
      </p>
    </div>
  );
}
