"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { SlideStage } from "@/components/wf/slide-stage";
import { useActiveDeck } from "@/hooks/use-active-deck";
import { useRoomSlide } from "@/hooks/use-room-slide";
import type { DeckSlide } from "@/lib/setlists-catalog";

const THUMB_FALLBACK_BG =
  "https://images.unsplash.com/photo-1507692049960-83aac4fc9040?w=1200&q=70";

function thumbPrimaryLabel(slide: DeckSlide): string {
  if (slide.layout === "song-title") {
    const body = slide.lines.map((l) => l.trim()).filter(Boolean).join(" ").trim();
    return body || slide.title.trim() || "Title";
  }
  return slide.title.trim() || "Slide";
}

function thumbLyricPreview(slide: DeckSlide): string {
  if (slide.layout === "song-title") return "Song title";
  const t = slide.lines.map((l) => l.trim()).filter(Boolean).join(" · ");
  return t || "—";
}

function RemoteSlideStripCard({
  slide,
  index,
  active,
  onPick,
}: {
  slide: DeckSlide;
  index: number;
  active: boolean;
  onPick: () => void;
}) {
  const color = slide.backgroundColor?.trim();
  const img = slide.backgroundUrl?.trim();
  const fullBleed = Boolean(slide.backgroundFullBleed) && Boolean(img) && !color;

  return (
    <button
      type="button"
      onClick={onPick}
      className={`group relative w-full shrink-0 overflow-hidden rounded-2xl border text-left transition active:scale-[0.99] ${
        active
          ? "border-sky-400/80 ring-2 ring-sky-400/35 shadow-[0_0_24px_rgba(56,189,248,0.2)]"
          : "border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]"
      }`}
    >
      <div className="relative aspect-[16/10] w-full">
        {color ? (
          <div className="absolute inset-0" style={{ backgroundColor: color }} aria-hidden />
        ) : (
          <div
            className={`absolute inset-0 bg-center ${fullBleed ? "bg-cover" : "scale-105 bg-cover"}`}
            style={{ backgroundImage: `url(${img || THUMB_FALLBACK_BG})` }}
            aria-hidden
          />
        )}
        <div
          className={
            fullBleed
              ? "absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/70"
              : "absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/55 to-slate-950/90"
          }
          aria-hidden
        />
        <div className="absolute inset-0 z-[1] flex flex-col justify-end p-3 sm:p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Slide {index + 1}
          </span>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow-md">
            {thumbPrimaryLabel(slide)}
          </p>
          <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-white/70 drop-shadow">
            {thumbLyricPreview(slide)}
          </p>
        </div>
      </div>
    </button>
  );
}

function BeamSlideChip({
  slide,
  index,
  active,
  onPick,
}: {
  slide: DeckSlide;
  index: number;
  active: boolean;
  onPick: () => void;
}) {
  const color = slide.backgroundColor?.trim();
  const img = slide.backgroundUrl?.trim();
  return (
    <button
      type="button"
      onClick={onPick}
      className={`relative h-28 w-[7.25rem] shrink-0 overflow-hidden rounded-xl border text-left transition ${
        active
          ? "border-amber-400/80 ring-2 ring-amber-400/30"
          : "border-white/10 hover:border-white/25"
      }`}
    >
      {color ? (
        <div className="absolute inset-0" style={{ backgroundColor: color }} aria-hidden />
      ) : (
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center"
          style={{ backgroundImage: `url(${img || THUMB_FALLBACK_BG})` }}
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 z-[1] p-2">
        <p className="text-[9px] font-bold text-amber-200/90">#{index + 1}</p>
        <p className="line-clamp-2 text-[10px] font-medium leading-tight text-white">{slide.title}</p>
      </div>
    </button>
  );
}

export function RemoteControl({ room }: { room: string }) {
  const { limitsApply, remotePolicyReady } = usePlanEntitlements();
  const localDeck = useActiveDeck();
  const { index: i, go, jump, beam, deck, clearBeam, publishBeam } = useRoomSlide({
    room,
    role: "master",
    localDeck,
  });

  const [copied, setCopied] = useState(false);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const deckSlide = deck[Math.min(i, deck.length - 1)]!;
  const beamSlides = beam?.slides;
  const beamIdx = beam?.index ?? 0;
  const beamOn = Boolean(beamSlides && beamSlides.length > 0);
  const onScreen = beamOn
    ? beamSlides![Math.min(beamIdx, beamSlides!.length - 1)]!
    : deckSlide;

  useEffect(() => {
    if (i > deck.length - 1) jump(0);
  }, [deck.length, i, jump]);

  useEffect(() => {
    const el = rowRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [i]);

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/[0.12] border-t-sky-500" />
        <p className="text-sm text-white/50">Checking your plan…</p>
      </div>
    );
  }

  if (limitsApply) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
          worshipflow2 · Remote pilot
        </p>
        <h1 className="text-xl font-bold tracking-tight">Pro feature</h1>
        <p className="max-w-sm text-sm text-white/55">
          Phone and tablet remote isn&apos;t included on the Free plan. Upgrade to Pro to control
          slides from another device on the same room id.
        </p>
        <Link
          href="/upgrade"
          className="rounded-full bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/40"
        >
          View plans
        </Link>
        <Link href="/dashboard" className="text-xs text-sky-400/90 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-zinc-950/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Remote
            </p>
            <p className="truncate font-mono text-[11px] text-sky-400/90">{room}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={shareUrl}
              className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/85 hover:bg-white/10"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/55 hover:text-white"
            >
              Exit
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pb-4 pt-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Live on screen
          </p>
          {beamOn ? (
            <p className="mt-1 text-[10px] font-semibold text-amber-200/85">
              Quick beam · {beamIdx + 1} / {beamSlides!.length}
            </p>
          ) : null}
          <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
            <SlideStage
              variant="preview"
              className="min-h-[min(40vh,20rem)] w-full rounded-2xl border-0 shadow-none"
              title={onScreen.title}
              lines={onScreen.lines}
              layout={onScreen.layout}
              backgroundUrl={onScreen.backgroundUrl}
              backgroundColor={onScreen.backgroundColor}
              backgroundFullBleed={onScreen.backgroundFullBleed}
              motion={false}
              typography={onScreen.typography ?? "editorial"}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-2xl border border-white/12 bg-white/[0.06] py-4 text-sm font-bold text-white/90 active:scale-[0.98] hover:bg-white/10"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 py-4 text-sm font-bold text-white shadow-lg shadow-blue-950/40 active:scale-[0.98] hover:brightness-110"
          >
            Next →
          </button>
        </div>

        {beamOn ? (
          <>
            <button
              type="button"
              onClick={() => clearBeam()}
              className="w-full rounded-2xl border border-amber-500/35 bg-amber-500/10 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-500/20"
            >
              Leave beam · return to setlist
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/55">
                Beam slides · swipe
              </p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                {beamSlides!.map((slide, idx) => (
                  <BeamSlideChip
                    key={`beam-${idx}-${slide.title.slice(0, 16)}`}
                    slide={slide}
                    index={idx}
                    active={idx === beamIdx}
                    onPick={() => {
                      const b = beam;
                      if (!b) return;
                      void publishBeam({ ...b, index: idx });
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Setlist · scroll &amp; tap
          </p>
          <p className="mt-0.5 text-[11px] text-white/45">
            Background and lyrics match each step. Tap to jump the room to that slide.
          </p>
          <div className="mt-3 flex max-h-[min(48vh,26rem)] min-h-[10rem] flex-col gap-3 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
            {deck.map((slide, idx) => (
              <div
                key={`${idx}-${slide.title.slice(0, 24)}`}
                ref={(el) => {
                  rowRefs.current[idx] = el;
                }}
                className="scroll-mt-20"
              >
                <RemoteSlideStripCard
                  slide={slide}
                  index={idx}
                  active={idx === i && !beamOn}
                  onPick={() => {
                    jump(idx);
                    if (beamOn) void clearBeam();
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mx-auto max-w-lg px-4 pb-6 text-center text-[10px] text-white/30">
        Same room as Present &amp; Audience. Sign in on both devices; internet required (not same
        Wi‑Fi).
      </p>
    </div>
  );
}
