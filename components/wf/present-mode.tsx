"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePlanEntitlements } from "@/components/wf/plan-entitlements-context";
import { PresentSlidePicker } from "@/components/wf/present-slide-picker";
import { QuickBeamModal } from "@/components/wf/quick-beam-modal";
import { SlideTransitionShell } from "@/components/wf/slide-transition-shell";
import { SlideStage } from "@/components/wf/slide-stage";
import { useActiveDeck } from "@/hooks/use-active-deck";
import { useRoomSlide } from "@/hooks/use-room-slide";
import { useSlideTransition } from "@/hooks/use-slide-transition";
import { FREE_TIER_SLIDE_BRANDING } from "@/lib/plan-limits";
import type { DeckSlide } from "@/lib/setlists-catalog";

function keyTargetIsFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("input, textarea, select, [contenteditable='true']");
}

export function PresentMode({ room }: { room: string }) {
  const { limitsApply, ready } = usePlanEntitlements();
  const deck = useActiveDeck();
  const count = Math.max(1, deck.length);
  const { index: i, go, jump, beam, publishBeam, clearBeam } = useRoomSlide({
    room,
    role: "master",
    slideCount: count,
  });

  const [quickBeamOpen, setQuickBeamOpen] = useState(false);
  const [slidePickerOpen, setSlidePickerOpen] = useState(false);
  const [slideTransition] = useSlideTransition();

  useEffect(() => {
    if (i > deck.length - 1) jump(0);
  }, [deck.length, i, jump]);

  const current = deck[Math.min(i, deck.length - 1)]!;
  const next = deck[Math.min(i + 1, deck.length - 1)]!;

  const beamSlides = beam?.slides;
  const beamIdx = beam?.index ?? 0;
  const onScreen: DeckSlide =
    beamSlides && beamSlides.length > 0
      ? beamSlides[Math.min(beamIdx, beamSlides.length - 1)]!
      : current;
  const onScreenNext: DeckSlide =
    beamSlides && beamSlides.length > 0
      ? beamSlides[Math.min(beamIdx + 1, beamSlides.length - 1)]!
      : next;

  const onScreenTransitionKey =
    beamSlides && beamSlides.length > 0 ? `beam-${beamIdx}` : `deck-${i}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (keyTargetIsFormField(e.target)) return;
      if (quickBeamOpen || slidePickerOpen) return;
      if (e.shiftKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        setQuickBeamOpen(true);
        return;
      }
      if (e.key === "ArrowRight" || e.key === " ") {
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
  }, [go, quickBeamOpen, slidePickerOpen]);

  useEffect(() => {
    if (!quickBeamOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickBeamOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [quickBeamOpen]);

  const audienceHref = `/present/audience?room=${encodeURIComponent(room)}`;
  const controlHref = `/present/control?room=${encodeURIComponent(room)}`;

  const copyRoom = useCallback(() => {
    void navigator.clipboard?.writeText(room);
  }, [room]);

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-black text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2 text-xs text-white/60">
        <Link
          href="/dashboard"
          className="rounded-lg px-2 py-1 hover:bg-white/10 hover:text-white"
        >
          ← Exit
        </Link>
        <div className="flex flex-wrap items-center gap-2 tabular-nums">
          <span>
            Setlist {i + 1} / {deck.length}
          </span>
          {beamSlides && beamSlides.length > 0 ? (
            <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
              Beam {beamIdx + 1}/{beamSlides.length}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyRoom}
            className="rounded-lg px-2 py-1 font-mono text-[10px] text-white/80 hover:bg-white/10"
            title="Copy room id"
          >
            Room: {room}
          </button>
          <Link
            href={audienceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-2 py-1 font-medium text-sky-400 hover:bg-white/10 hover:text-sky-200"
          >
            Audience →
          </Link>
          {!limitsApply ? (
            <Link
              href={controlHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-2 py-1 font-medium text-emerald-300/90 hover:bg-white/10"
            >
              Remote →
            </Link>
          ) : (
            <span
              className="rounded-lg px-2 py-1 text-[10px] font-medium text-white/35"
              title="Remote control is a Pro feature"
            >
              Remote (Pro)
            </span>
          )}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-2 lg:gap-4 lg:p-5">
        <div className="flex min-h-0 flex-col">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/45">
            On screen
          </p>
          <SlideTransitionShell
            transition={slideTransition}
            transitionKey={onScreenTransitionKey}
            className="flex min-h-[38vh] min-h-0 flex-1 flex-col lg:min-h-0"
          >
            <SlideStage
              className="min-h-[38vh] flex-1 lg:min-h-0"
              title={onScreen.title}
              lines={onScreen.lines}
              layout={onScreen.layout}
              backgroundUrl={onScreen.backgroundUrl}
              backgroundColor={onScreen.backgroundColor}
              backgroundFullBleed={onScreen.backgroundFullBleed}
              motion={!onScreen.backgroundColor?.trim() && !onScreen.backgroundFullBleed}
              typography={onScreen.typography ?? "editorial"}
              tierWatermark={ready && limitsApply ? FREE_TIER_SLIDE_BRANDING : undefined}
            />
          </SlideTransitionShell>
        </div>
        <div className="flex min-h-0 flex-col opacity-95">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/45">
            Next
          </p>
          <SlideStage
            className="min-h-[28vh] flex-1 scale-[0.98] lg:min-h-0"
            title={onScreenNext.title}
            lines={onScreenNext.lines}
            layout={onScreenNext.layout}
            backgroundUrl={onScreenNext.backgroundUrl}
            backgroundColor={onScreenNext.backgroundColor}
            backgroundFullBleed={onScreenNext.backgroundFullBleed}
            motion={!onScreenNext.backgroundColor?.trim() && !onScreenNext.backgroundFullBleed}
            typography={onScreenNext.typography ?? "editorial"}
            tierWatermark={ready && limitsApply ? FREE_TIER_SLIDE_BRANDING : undefined}
          />
        </div>
      </div>

      <footer className="border-t border-white/10 bg-black/80 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-[12px] border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-[12px] bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-black/40"
          >
            Next
          </button>
          {beamSlides && beamSlides.length > 0 ? (
            <button
              type="button"
              onClick={() => clearBeam()}
              className="rounded-[12px] border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/20"
            >
              Back to setlist
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSlidePickerOpen(true)}
            className="rounded-[12px] border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
          >
            All slides…
          </button>
          <button
            type="button"
            data-wf-tour="tour-present-quick-verse"
            title="Shortcut: Shift+B"
            onClick={() => setQuickBeamOpen(true)}
            className="rounded-[12px] border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Quick beam…
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-white/35">
          Use <strong className="text-white/50">All slides</strong> to preview lyric lines and jump anywhere
          in the setlist. Deck comes from the <strong className="text-white/50">Dashboard</strong>.{" "}
          <strong className="text-white/50">Quick beam</strong> ( <span className="text-white/40">Shift+B</span> )
          sends scripture or a spontaneous song without editing the setlist. Open{" "}
          <strong className="text-white/50">Audience</strong> on the projector.
        </p>
      </footer>

      <QuickBeamModal
        open={quickBeamOpen}
        onClose={() => setQuickBeamOpen(false)}
        publishBeam={publishBeam}
        limitsApply={limitsApply}
      />

      <PresentSlidePicker
        open={slidePickerOpen}
        onClose={() => setSlidePickerOpen(false)}
        deck={deck}
        activeIndex={i}
        onJump={(idx) => {
          jump(idx);
          if (beamSlides && beamSlides.length > 0) void clearBeam();
        }}
      />
    </div>
  );
}
