"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { SlideStage } from "@/components/wf/slide-stage";
import { useActiveDeck } from "@/hooks/use-active-deck";
import { useRoomSlide } from "@/hooks/use-room-slide";
import type { DeckSlide } from "@/lib/setlists-catalog";
import { PresentationSupersededOverlay } from "@/components/wf/presentation-superseded-overlay";

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
      <div className="relative h-[15.5rem] w-full sm:h-[17.5rem]">
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
              ? "absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/75"
              : "absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/65 to-slate-950/92"
          }
          aria-hidden
        />
        <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center px-4 py-5 text-center sm:px-6 sm:py-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50 sm:text-xs">
            Slide {index + 1}
          </span>
          <p className="mt-2 line-clamp-3 text-base font-bold leading-snug text-white drop-shadow-md sm:text-lg md:text-xl">
            {thumbPrimaryLabel(slide)}
          </p>
          <p className="mt-2 line-clamp-4 max-w-[96%] text-sm leading-relaxed text-white/85 drop-shadow sm:text-base md:text-[1.05rem]">
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
      className={`relative h-36 w-[8.75rem] shrink-0 overflow-hidden rounded-xl border text-left transition sm:h-40 sm:w-[9.5rem] ${
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/80" aria-hidden />
      <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center px-2 text-center">
        <p className="text-[10px] font-bold text-amber-200/95 sm:text-[11px]">#{index + 1}</p>
        <p className="mt-1 line-clamp-3 text-xs font-semibold leading-snug text-white drop-shadow sm:text-sm">
          {slide.title}
        </p>
      </div>
    </button>
  );
}

export function RemoteControl({ room }: { room: string }) {
  const { limitsApply, remotePolicyReady } = usePlanEntitlements();
  const localDeck = useActiveDeck();
  const { index: i, go, jump, beam, deck, clearBeam, publishBeam, sessionSuperseded } = useRoomSlide({
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
    if (deck.length < 1) return;
    const max = deck.length - 1;
    if (i > max) jump(max);
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
    <div className="relative flex min-h-[100dvh] flex-col bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-white">
      <PresentationSupersededOverlay open={sessionSuperseded} variant="remote" />
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-zinc-950/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
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

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pb-4 pt-4">
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
              previewSize="large"
              className="min-h-[min(48vh,26rem)] w-full rounded-2xl border-0 shadow-none sm:min-h-[min(50vh,28rem)]"
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
          <div className="mt-3 flex max-h-[min(54vh,34rem)] min-h-[12rem] flex-col gap-4 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
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

      <p className="mx-auto max-w-xl px-4 pb-6 text-center text-[10px] text-white/30">
        Same room as Present &amp; Audience. Sign in on both devices; internet required (not same
        Wi‑Fi).
      </p>
    </div>
  );
}
