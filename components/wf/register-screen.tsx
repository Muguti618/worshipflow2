"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { registerAccount } from "@/lib/auth-local";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { clearGuestDashboardAllow } from "@/lib/guest-access";
import { isSupabaseConfigured, supabaseSignUp } from "@/lib/supabase-auth";

export function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/dashboard");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("next");
    setRedirectTo(safeInternalPath(q, "/dashboard"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      if (isSupabaseConfigured()) {
        const { error: supaErr, needsEmailConfirmation } = await supabaseSignUp(name, email, password);
        if (supaErr) {
          setError(supaErr);
          return;
        }
        if (needsEmailConfirmation) {
          setInfo("Check your email to confirm your account, then sign in.");
          return;
        }
      } else {
        const r = await registerAccount(name, email, password);
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
        <h1 className="text-2xl font-bold tracking-tight text-wf-text">Create your account</h1>
        <p className="mt-2 text-sm text-wf-muted">Join worshipflow2 on this device</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="wf-reg-name" className="mb-1.5 block text-xs font-medium text-wf-muted">
            Display name
          </label>
          <input
            id="wf-reg-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-11 w-full rounded-[12px] border border-wf-input-border bg-wf-bg/80 px-3.5 text-sm text-wf-text outline-none transition focus:border-sky-500/45 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Alex Morgan"
          />
        </div>
        <div>
          <label htmlFor="wf-reg-email" className="mb-1.5 block text-xs font-medium text-wf-muted">
            Email
          </label>
          <input
            id="wf-reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 w-full rounded-[12px] border border-wf-input-border bg-wf-bg/80 px-3.5 text-sm text-wf-text outline-none transition focus:border-sky-500/45 focus:ring-2 focus:ring-sky-500/20"
            placeholder="you@church.org"
          />
        </div>
        <div>
          <label htmlFor="wf-reg-password" className="mb-1.5 block text-xs font-medium text-wf-muted">
            Password
          </label>
          <input
            id="wf-reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-11 w-full rounded-[12px] border border-wf-input-border bg-wf-bg/80 px-3.5 text-sm text-wf-text outline-none transition focus:border-sky-500/45 focus:ring-2 focus:ring-sky-500/20"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label htmlFor="wf-reg-confirm" className="mb-1.5 block text-xs font-medium text-wf-muted">
            Confirm password
          </label>
          <input
            id="wf-reg-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="h-11 w-full rounded-[12px] border border-wf-input-border bg-wf-bg/80 px-3.5 text-sm text-wf-text outline-none transition focus:border-sky-500/45 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Repeat password"
          />
        </div>
        {error ? (
          <p className="rounded-[10px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200/90">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-[10px] border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/90">
            {info}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-[12px] bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-black/35 transition hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-wf-muted">
        Already have an account?{" "}
        <Link
          href={
            redirectTo === "/dashboard"
              ? "/login"
              : `/login?next=${encodeURIComponent(redirectTo)}`
          }
          className="font-semibold text-sky-400 hover:underline"
        >
          Sign in
        </Link>
      </p>
      <p className="mt-4 text-center">
        <Link href="/" className="text-xs text-wf-muted hover:text-wf-text hover:underline">
          ← Back to home
        </Link>
      </p>
      <p className="mt-6 border-t border-wf-border pt-4 text-[10px] leading-relaxed text-wf-muted/90">
        {isSupabaseConfigured()
          ? "Account is created in Supabase. You can disable email confirmation in the Supabase dashboard for faster testing."
          : "Registration saves a hashed password in this browser only. Add Supabase env vars for cloud auth."}
      </p>
    </div>
  );
}
