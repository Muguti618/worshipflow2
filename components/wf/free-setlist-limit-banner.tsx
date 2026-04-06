"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { FREE_MAX_SETLISTS } from "@/lib/plan-limits";

export const FreeSetlistLimitBanner = forwardRef<HTMLDivElement>(function FreeSetlistLimitBanner(
  _props,
  ref,
) {
  return (
    <div
      ref={ref}
      className="shrink-0 border-b border-amber-500/35 bg-gradient-to-br from-amber-500/[0.18] via-orange-600/[0.12] to-blue-700/[0.14] px-4 py-6 shadow-lg shadow-black/20 sm:px-6 sm:py-8"
      role="region"
      aria-label="Setlist limit"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-100/90">
            Free plan · setlist limit reached
          </p>
          <p className="text-xl font-bold tracking-tight text-wf-text sm:text-2xl">
            {FREE_MAX_SETLISTS === 1
              ? "You are using your only setlist on Free"
              : `You are using all ${FREE_MAX_SETLISTS} setlists on Free`}
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-amber-50/85">
            Upgrade to Pro for unlimited setlists, plus unlimited songs, remote control, and full AI.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
          <Link
            href="/upgrade"
            className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-[14px] bg-gradient-to-r from-amber-400 to-orange-500 px-8 text-sm font-bold text-amber-950 shadow-lg shadow-amber-950/30 transition hover:brightness-110"
          >
            Upgrade to Pro
          </Link>
          <p className="text-center text-[11px] text-amber-100/60 sm:text-right">Secure checkout with Stripe</p>
        </div>
      </div>
    </div>
  );
});
