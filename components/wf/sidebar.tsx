"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { useAuthSession } from "@/hooks/use-auth-session";

function userInitials(name: string, email: string): string {
  const n = name.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]![0] ?? "";
      const b = parts[parts.length - 1]![0] ?? "";
      return `${a}${b}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase() || email.slice(0, 2).toUpperCase();
  }
  const e = email.trim();
  return e.slice(0, 2).toUpperCase() || "?";
}

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/songs", label: "Songs", icon: "🎵" },
  { href: "/studio", label: "Slide Studio", icon: "⚡" },
  { href: "/bible", label: "Bible", icon: "✝️" },
  { href: "/setlists", label: "Setlists", icon: "📅" },
  { href: "/ai", label: "Assistant", icon: "✨" },
  { href: "/tutorial", label: "Tutorial", icon: "📖" },
  { href: "/upgrade", label: "Upgrade", icon: "✨" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { session, hydrated, logout } = useAuthSession();
  const { ready: planReady, isPro, limitsApply, billingAvailable } = usePlanEntitlements();

  const hideUpgradeNav = Boolean(session && billingAvailable && planReady && isPro);
  const navItems = nav.filter((item) => item.href !== "/upgrade" || !hideUpgradeNav);

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-wf-border">
      <div className="flex h-14 items-center border-b border-wf-border bg-wf-card px-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-wf-text">
            worshipflow2
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-wf-muted">
            Worship deck
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 bg-wf-card/40 p-3 backdrop-blur-xl">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              {...(item.href === "/songs" ? { "data-wf-tour": "tour-nav-songs" } : {})}
              className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-wf-text/[0.08] text-wf-text shadow-[0_0_0_1px_rgba(139,92,246,0.25)]"
                  : "text-wf-muted hover:bg-wf-text/[0.04] hover:text-wf-text"
              }`}
            >
              <span className="text-base" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-wf-border bg-wf-card/40 p-3 backdrop-blur-xl">
        {!hydrated ? (
          <div
            className="h-[52px] animate-pulse rounded-[12px] bg-wf-text/[0.06]"
            aria-hidden
          />
        ) : session ? (
          <>
            <div className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600/50 to-slate-700/50 text-xs font-bold text-white"
                aria-hidden
              >
                {userInitials(session.name, session.email)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-wf-text">{session.name}</p>
                <p className="truncate text-xs text-wf-muted">{session.email}</p>
              </div>
            </div>

            {limitsApply ? (
              <div className="mt-3 rounded-[14px] border border-amber-500/40 bg-gradient-to-br from-amber-500/[0.14] to-orange-600/[0.08] p-3 shadow-md shadow-black/20">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200/95">Free plan</p>
                <p className="mt-1 text-[11px] leading-snug text-amber-100/90">
                  Upgrade for Pro features, full AI, and secure checkout with Stripe.
                </p>
                <Link
                  href="/upgrade"
                  className="mt-2.5 flex h-9 items-center justify-center rounded-[10px] bg-amber-400/95 text-xs font-bold text-amber-950 shadow-sm transition hover:bg-amber-300"
                >
                  Choose plan
                </Link>
              </div>
            ) : session && billingAvailable && planReady && isPro ? (
              <div className="mt-3 rounded-[12px] border border-wf-border/80 bg-wf-bg/40 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-wf-muted">Plan</p>
                <p className="text-xs font-medium text-wf-text">Pro</p>
                <Link
                  href="/upgrade"
                  className="mt-1.5 inline-block text-[10px] font-medium text-sky-400 underline-offset-2 hover:underline"
                >
                  Billing &amp; invoices
                </Link>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void logout()}
              className="mt-3 w-full rounded-[12px] border border-wf-border px-3 py-2 text-center text-xs font-semibold text-wf-muted transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200/90"
            >
              Sign out
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-[12px] bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-black/30 transition hover:brightness-110"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="flex w-full items-center justify-center rounded-[12px] border border-wf-border py-2.5 text-sm font-medium text-wf-muted transition hover:border-white/18 hover:text-wf-text"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
