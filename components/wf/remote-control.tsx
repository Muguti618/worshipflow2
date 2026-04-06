"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { useActiveDeck } from "@/hooks/use-active-deck";
import { useRoomSlide } from "@/hooks/use-room-slide";

export function RemoteControl({ room }: { room: string }) {
  const { limitsApply, remotePolicyReady } = usePlanEntitlements();
  const deck = useActiveDeck();
  const count = Math.max(1, deck.length);
  const { index: i, go, jump, beam, clearBeam } = useRoomSlide({
    room,
    role: "master",
    slideCount: count,
  });

  const [copied, setCopied] = useState(false);
  const deckSlide = deck[Math.min(i, deck.length - 1)]!;
  const beamSlides = beam?.slides;
  const beamIdx = beam?.index ?? 0;
  const onScreen =
    beamSlides && beamSlides.length > 0
      ? beamSlides[Math.min(beamIdx, beamSlides.length - 1)]!
      : deckSlide;

  useEffect(() => {
    if (i > deck.length - 1) jump(0);
  }, [deck.length, i, jump]);

  const shareUrl = useCallback(() => {
    const u = `${typeof window !== "undefined" ? window.location.origin : ""}/present/control?room=${encodeURIComponent(room)}`;
    void navigator.clipboard?.writeText(u);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [room]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!remotePolicyReady) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
        <p className="text-sm text-white/50">Checking your plan…</p>
      </div>
    );
  }

  if (limitsApply) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
          LumenWorship · Remote pilot
        </p>
        <h1 className="text-xl font-bold tracking-tight">Pro feature</h1>
        <p className="max-w-sm text-sm text-white/55">
          Phone and tablet remote isn&apos;t included on the Free plan. Upgrade to Pro to control
          slides from another device on the same room id.
        </p>
        <Link
          href="/upgrade"
          className="rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40"
        >
          View plans
        </Link>
        <Link href="/dashboard" className="text-xs text-violet-300/90 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-950 px-4 py-6 text-white">
      <header className="mb-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
          LumenWorship · Remote pilot
        </p>
        <h1 className="mt-2 text-xl font-bold tracking-tight">Control</h1>
        <p className="mt-1 text-sm text-white/50">
          Room <span className="font-mono text-violet-300">{room}</span>
        </p>
        <button
          type="button"
          onClick={shareUrl}
          className="mt-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
        >
          {copied ? "Copied link" : "Copy controller link"}
        </button>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Now on screen
          </p>
          {beamSlides && beamSlides.length > 0 ? (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/80">
              Bible beam {beamIdx + 1}/{beamSlides.length}
            </p>
          ) : null}
          <p className="mt-1 text-lg font-semibold text-white">{onScreen.title}</p>
          <p className="mt-2 line-clamp-3 text-sm text-white/55">{onScreen.lines.join(" · ")}</p>
        </div>

        {beamSlides && beamSlides.length > 0 ? (
          <button
            type="button"
            onClick={() => clearBeam()}
            className="w-full rounded-2xl border border-amber-500/35 bg-amber-500/10 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-500/20"
          >
            Back to setlist
          </button>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-2xl border border-white/15 bg-white/5 py-8 text-lg font-bold hover:bg-white/10 active:scale-[0.98]"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 py-8 text-lg font-bold shadow-lg shadow-violet-900/40 active:scale-[0.98]"
          >
            Next →
          </button>
        </div>

        <div>
          <label htmlFor="wf-remote-jump" className="text-xs text-white/45">
            Jump
          </label>
          <select
            id="wf-remote-jump"
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 py-3 text-sm outline-none"
            value={i}
            onChange={(e) => jump(Number(e.target.value))}
          >
            {deck.map((s, idx) => (
              <option key={`${idx}-${s.title}`} value={idx}>
                {idx + 1}. {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-8 text-center text-[11px] text-white/35">
        Deck syncs from the dashboard setlist. Same room id as Present and Audience.
      </p>
    </div>
  );
}
